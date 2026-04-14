import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStripe, tierFromPriceId, createCustomerPortalSession } from '@/lib/stripe';
import type Stripe from 'stripe';
import { logErrorServer } from '@/lib/log-error-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { renderPaymentFailedEmail } from '@/lib/onboarding-emails';
import { sendMetaEvent } from '@/lib/meta-capi';

const FROM_EMAIL = 'BetAutopsy <noreply@betautopsy.com>';

// Use service role key -- this endpoint is called by Stripe, not a user session
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency: Stripe retries on timeout/5xx, so we short-circuit if we've
  // already processed this event.id. A unique_violation (23505) on insert means
  // another delivery already claimed it.
  //
  // If the dedup table itself errors out (e.g. transient DB issue, table missing
  // post-deploy, RLS misconfigured), we MUST NOT block payment processing —
  // returning 500 here causes Stripe to retry forever and creates a payment-
  // confirmation outage. Log loudly and proceed; at worst we double-process a
  // single event, which downstream handlers tolerate via .eq() updates.
  try {
    const { error: dedupeErr } = await supabase
      .from('stripe_events')
      .insert({ id: event.id });

    if (dedupeErr) {
      if (dedupeErr.code === '23505') {
        return NextResponse.json({ received: true });
      }
      // Non-duplicate error: alert but don't 500, so payment processing continues.
      console.error('stripe_events insert failed (proceeding anyway):', dedupeErr);
      logErrorServer(dedupeErr, { path: '/api/webhook', metadata: { event_id: event.id, event_type: event.type, dedupe_failed: true } });
    }
  } catch (e) {
    console.error('stripe_events dedupe threw (proceeding anyway):', e);
    logErrorServer(e, { path: '/api/webhook', metadata: { event_id: event.id, event_type: event.type, dedupe_threw: true } });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'payment') {
          // One-time report purchase ($9.99 or $4.99 extra)
          const reportId = session.metadata?.report_id;
          const userId = session.metadata?.supabase_user_id;
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;

          if (reportId && userId) {
            // Mark the snapshot as paid so it can be upgraded to full
            await supabase
              .from('autopsy_reports')
              .update({
                is_paid: true,
                stripe_payment_intent_id: paymentIntentId || null,
              })
              .eq('id', reportId)
              .eq('user_id', userId);

            // Save customer ID to profile if not already there
            if (session.customer) {
              await supabase
                .from('profiles')
                .update({
                  stripe_customer_id: session.customer as string,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId);
            }
          }
        } else if (session.mode === 'subscription') {
          // Pro subscription
          const userId = session.metadata?.supabase_user_id;

          if (userId) {
            await supabase
              .from('profiles')
              .update({
                subscription_tier: 'pro',
                subscription_status: 'active',
                stripe_customer_id: session.customer as string,
                reports_used_this_period: 0,
                current_period_start: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
        }

        // Fire Meta CAPI Purchase event (additive to client-side pixel).
        // Best-effort: swallow failures so the webhook still returns 200 and
        // Stripe doesn't retry on Meta's account. The DB updates above are
        // authoritative — attribution is secondary.
        try {
          const email =
            session.customer_details?.email ??
            session.customer_email ??
            null;
          const amountTotal =
            typeof session.amount_total === 'number'
              ? session.amount_total / 100
              : 0;
          const currency = (session.currency ?? 'usd').toUpperCase();
          const tier = session.mode === 'subscription' ? 'pro' : 'full';
          await sendMetaEvent({
            event_name: 'Purchase',
            // Stripe session ID is unique & stable — use it as the dedup key
            // so Meta collapses this with any client-side Purchase fire that
            // references the same session.
            event_id: session.id,
            event_source_url:
              process.env.NEXT_PUBLIC_APP_URL || 'https://www.betautopsy.com',
            user_data: {
              email,
              // fbc/fbp cookies aren't available in a Stripe-initiated POST;
              // Meta will attribute via email hash + event_id dedup instead.
            },
            custom_data: {
              currency,
              value: amountTotal,
              content_name: `BetAutopsy ${tier}`,
              content_ids: [tier],
              content_type: 'product',
            },
          });
        } catch (metaErr) {
          console.error('Meta CAPI Purchase fire failed:', metaErr);
          logErrorServer(metaErr, {
            path: '/api/webhook',
            metadata: { event_type: 'checkout.session.completed', stage: 'meta_capi' },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const status = subscription.status;

        if (priceId) {
          const tier = tierFromPriceId(priceId);
          const updateData: Record<string, string | number> = {
            updated_at: new Date().toISOString(),
          };

          if (tier) updateData.subscription_tier = tier;

          if (status === 'active' || status === 'trialing') {
            updateData.subscription_status = 'active';
          } else if (status === 'past_due') {
            updateData.subscription_status = 'past_due';
          } else if (status === 'canceled' || status === 'unpaid') {
            updateData.subscription_status = 'canceled';
            updateData.subscription_tier = 'free';
          }

          // Reset report counter on billing cycle renewal
          const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start;
          if (periodStart) {
            updateData.current_period_start = new Date(periodStart * 1000).toISOString();
            updateData.reports_used_this_period = 0;
          }

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        // Recovery email: give the user a one-click path to update their card
        // before Stripe exhausts its retry schedule and we auto-cancel.
        // Best-effort — failures here log to Sentry but don't 500 the webhook.
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (profile?.email && isResendConfigured()) {
            const portalUrl = await createCustomerPortalSession(customerId);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.betautopsy.com';
            const amountDue =
              typeof invoice.amount_due === 'number' && invoice.amount_due > 0
                ? `$${(invoice.amount_due / 100).toFixed(2)}`
                : undefined;
            const email = renderPaymentFailedEmail({
              displayName: (profile.display_name as string | null) || 'there',
              appUrl,
              portalUrl,
              amountDue,
            });
            await getResend().emails.send({
              from: FROM_EMAIL,
              to: profile.email as string,
              subject: email.subject,
              html: email.html,
            });
          }
        } catch (recoveryErr) {
          console.error('Failed payment recovery email failed:', recoveryErr);
          logErrorServer(recoveryErr, {
            path: '/api/webhook',
            metadata: { event_type: 'invoice.payment_failed', customer_id: customerId },
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    logErrorServer(error, { path: '/api/webhook' });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
