import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStripe, tierFromPriceId } from '@/lib/stripe';
import type Stripe from 'stripe';
import { logErrorServer } from '@/lib/log-error-server';

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
