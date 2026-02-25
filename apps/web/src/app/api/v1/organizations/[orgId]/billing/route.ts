import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { getStripe } from "@/lib/stripe/server";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error || !org) throw new NotFoundError("Organization");

    const metadata = (org.metadata as Record<string, unknown>) || {};
    const stripeCustomerId = metadata.stripe_customer_id as string | undefined;
    const plan = (metadata.billing_plan as string) || "free";
    const planName = PLAN_NAMES[plan] || "Free";

    let nextInvoiceDate: string | null = null;
    let cancelAtPeriodEnd = false;

    if (stripeCustomerId) {
      try {
        const subscriptions = await getStripe().subscriptions.list({
          customer: stripeCustomerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0] as unknown as Record<string, unknown>;
          if (typeof sub.current_period_end === "number") {
            nextInvoiceDate = new Date(
              sub.current_period_end * 1000
            ).toISOString();
          }
          cancelAtPeriodEnd = !!sub.cancel_at_period_end;
        }
      } catch {
        // Stripe API error - continue with defaults
      }
    }

    return jsonResponse({
      plan,
      planName,
      stripeCustomerId: stripeCustomerId || null,
      nextInvoiceDate,
      cancelAtPeriodEnd,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
