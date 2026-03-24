import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStripe, tierFromPriceId } from '@/lib/stripe';
import type Stripe from 'stripe';

// Use service role key — this endpoint is called by Stripe, not a user session
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
        const userId = session.metadata?.supabase_user_id;
        const tier = session.metadata?.tier;

        if (userId && tier) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
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
          const updateData: Record<string, string> = {
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
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
