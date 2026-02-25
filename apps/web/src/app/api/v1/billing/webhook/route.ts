import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Use service role client for webhook processing (no user context)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function updateOrgBillingPlan(orgId: string, plan: string) {
  const supabase = getAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("metadata")
    .eq("id", orgId)
    .single();

  const metadata = (org?.metadata as Record<string, unknown>) || {};

  await supabase
    .from("organizations")
    .update({
      metadata: { ...metadata, billing_plan: plan },
    })
    .eq("id", orgId);
}

function getPlanFromAmount(amount: number): string {
  if (amount >= 19900) return "enterprise";
  if (amount >= 4900) return "pro";
  return "free";
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan;

        if (orgId && plan) {
          await updateOrgBillingPlan(orgId, plan);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;

        if (orgId) {
          const item = subscription.items.data[0];
          const amount =
            (item?.price?.unit_amount ?? 0);
          const plan = getPlanFromAmount(amount);
          await updateOrgBillingPlan(orgId, plan);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;

        if (orgId) {
          await updateOrgBillingPlan(orgId, "free");
        }
        break;
      }

      default:
        // Unhandled event type - ignore
        break;
    }
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
