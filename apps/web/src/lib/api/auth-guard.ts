import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "./errors";
import type { MembershipRole } from "@openfive/shared";

export interface AuthContext {
  userId: string;
  email: string;
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return {
    userId: user.id,
    email: user.email || "",
  };
}

export async function requireOrgRole(
  orgId: string,
  roles: MembershipRole[]
): Promise<AuthContext> {
  const auth = await getAuthContext();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", auth.userId)
    .single();

  if (!membership || !roles.includes(membership.role as MembershipRole)) {
    throw new ForbiddenError();
  }

  return auth;
}

export async function requireOrgMember(orgId: string): Promise<AuthContext> {
  return requireOrgRole(orgId, ["owner", "admin", "member", "viewer"]);
}

export async function requireOrgAdmin(orgId: string): Promise<AuthContext> {
  return requireOrgRole(orgId, ["owner", "admin"]);
}
