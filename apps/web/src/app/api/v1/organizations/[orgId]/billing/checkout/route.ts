import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { getStripe } from "@/lib/stripe/server";

const PRICE_MAP: Record<string, { priceId: string; name: string; amount: number }> = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly",
    name: "Pro",
    amount: 4900,
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise_monthly",
    name: "Enterprise",
    amount: 19900,
  },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const auth = await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const body = await request.json();
    const plan = body.plan as string;

    if (!plan || !PRICE_MAP[plan]) {
      throw new BadRequestError(
        "Invalid plan. Choose 'pro' or 'enterprise'."
      );
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error || !org) throw new NotFoundError("Organization");

    const metadata = (org.metadata as Record<string, unknown>) || {};
    let stripeCustomerId = metadata.stripe_customer_id as string | undefined;

    // Create Stripe customer if it doesn't exist
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: auth.email,
        metadata: {
          org_id: orgId,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to org metadata
      await supabase
        .from("organizations")
        .update({
          metadata: { ...metadata, stripe_customer_id: stripeCustomerId },
        })
        .eq("id", orgId);
    }

    const selectedPlan = PRICE_MAP[plan];

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        org_id: orgId,
        plan,
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
