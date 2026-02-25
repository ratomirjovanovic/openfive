import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { getStripe } from "@/lib/stripe/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error || !org) throw new NotFoundError("Organization");

    const metadata = (org.metadata as Record<string, unknown>) || {};
    const stripeCustomerId = metadata.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
      throw new BadRequestError(
        "No billing account found. Please subscribe to a plan first."
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
