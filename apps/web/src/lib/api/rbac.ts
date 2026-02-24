import type { MembershipRole, ProjectRole } from "@openfive/shared";

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function hasMinRole(
  userRole: MembershipRole,
  requiredRole: MembershipRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function hasMinProjectRole(
  userRole: ProjectRole,
  requiredRole: ProjectRole
): boolean {
  return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[requiredRole];
}

export function canManageRole(
  managerRole: MembershipRole,
  targetRole: MembershipRole
): boolean {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}
