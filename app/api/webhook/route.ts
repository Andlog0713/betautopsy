import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStripe, tierFromPriceId, createCustomerPortalSession } from '@/lib/stripe';
import type Stripe from 'stripe';
import { logErrorServer } from '@/lib/log-error-server';
import { isResendConfigured, getResend } from '@/lib/resend';
import { renderPaymentFailedEmail } from '@/lib/onboarding-emails';
import { sendMetaEvent } from '@/lib/meta-capi';
import { waitUntil } from '@vercel/functions';
import {
  processPaidReportFulfillment,
  queuePaidReportFulfillment,
} from '@/lib/paid-report-fulfillment';

const FROM_EMAIL = 'BetAutopsy <noreply@betautopsy.com>';

export const maxDuration = 300;
const PROVIDER_ACK_WAIT_MS = 5_000;

async function fulfillmentNeedsProviderRetry(
  work: ReturnType<typeof processPaidReportFulfillment>,
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      work,
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(() => resolve('timeout'), PROVIDER_ACK_WAIT_MS);
      }),
    ]);
    return result === 'timeout' || result.status !== 'completed';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

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
  let providerRetryNeeded = false;
  const isReportPaymentEvent = (
    event.type === 'checkout.session.completed'
    || event.type === 'checkout.session.async_payment_succeeded'
  )
    && (event.data.object as Stripe.Checkout.Session).mode === 'payment';

  // One-time report payment events use queue_report_fulfillment below. That
  // transaction records the Stripe event and the durable generation state
  // together, and duplicate delivery re-drives unfinished work. Other event
  // types retain the existing event-level idempotency behavior.
  if (!isReportPaymentEvent) {
    // Idempotency: Stripe retries on timeout/5xx, so we short-circuit if we've
    // already processed this event.id. A unique_violation (23505) on insert means
    // another delivery already claimed it.
    //
    // If the dedup table itself errors out (e.g. transient DB issue, table missing
    // post-deploy, RLS misconfigured), we MUST NOT block payment processing.
    // Returning 500 here causes Stripe to retry forever and creates a payment
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
        // Non-duplicate error: alert but do not block event handling.
        console.error('stripe_events insert failed (proceeding anyway):', dedupeErr);
        logErrorServer(dedupeErr, { path: '/api/webhook', metadata: { event_id: event.id, event_type: event.type, dedupe_failed: true } });
      }
    } catch (e) {
      console.error('stripe_events dedupe threw (proceeding anyway):', e);
      logErrorServer(e, { path: '/api/webhook', metadata: { event_id: event.id, event_type: event.type, dedupe_threw: true } });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'payment') {
          // One-time report purchase ($19.99, or $4.99 extra for existing Pro subscribers)
          const reportId = session.metadata?.report_id;
          const userId = session.metadata?.supabase_user_id;
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;

          if (session.payment_status !== 'paid') {
            console.warn('Ignoring completed report checkout without paid status', {
              session_id: session.id,
              payment_status: session.payment_status,
            });
            break;
          }

          if (!reportId || !userId || !paymentIntentId) {
            throw new Error('Paid report checkout is missing fulfillment metadata');
          }

          const queued = await queuePaidReportFulfillment({
            snapshotId: reportId,
            userId,
            provider: 'stripe',
            providerEventId: event.id,
            paymentReference: paymentIntentId,
            checkoutSessionId: session.id,
          }, supabase);

          if (queued.paymentConflict) {
            await logErrorServer(new Error('Paid report payment conflicts with existing fulfillment'), {
              path: '/api/webhook',
              userId,
              metadata: {
                event_id: event.id,
                checkout_session_id: session.id,
                report_id: reportId,
                payment_intent_id: paymentIntentId,
              },
            });
          } else if (queued.shouldStart) {
            const work = processPaidReportFulfillment({ snapshotId: reportId });
            waitUntil(work);
            providerRetryNeeded = await fulfillmentNeedsProviderRetry(work);
          } else if (queued.status !== 'completed') {
            // Keep Stripe retrying the verified event while an unfinished
            // durable job is leased. A later delivery reclaims an expired
            // lease or requeues a persisted failure without any browser.
            providerRetryNeeded = true;
          }

          // Save customer ID to profile if not already there.
          if (session.customer) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                stripe_customer_id: session.customer as string,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (profileError) {
              await logErrorServer(profileError, {
                path: '/api/webhook',
                userId,
                metadata: { event_id: event.id, stage: 'stripe_customer_id_update' },
              });
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
            metadata: { event_type: event.type, stage: 'meta_capi' },
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

  if (providerRetryNeeded) {
    return NextResponse.json(
      { received: false, status: 'fulfillment_pending' },
      { status: 503 },
    );
  }

  return NextResponse.json({ received: true });
}
