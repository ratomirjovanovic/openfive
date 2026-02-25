import { describe, it, expect } from "vitest";
import { hasMinRole, hasMinProjectRole, canManageRole } from "@/lib/api/rbac";

describe("hasMinRole", () => {
  describe("owner role", () => {
    it("owner meets owner requirement", () => {
      expect(hasMinRole("owner", "owner")).toBe(true);
    });

    it("owner meets admin requirement", () => {
      expect(hasMinRole("owner", "admin")).toBe(true);
    });

    it("owner meets member requirement", () => {
      expect(hasMinRole("owner", "member")).toBe(true);
    });

    it("owner meets viewer requirement", () => {
      expect(hasMinRole("owner", "viewer")).toBe(true);
    });
  });

  describe("admin role", () => {
    it("admin does not meet owner requirement", () => {
      expect(hasMinRole("admin", "owner")).toBe(false);
    });

    it("admin meets admin requirement", () => {
      expect(hasMinRole("admin", "admin")).toBe(true);
    });

    it("admin meets member requirement", () => {
      expect(hasMinRole("admin", "member")).toBe(true);
    });

    it("admin meets viewer requirement", () => {
      expect(hasMinRole("admin", "viewer")).toBe(true);
    });
  });

  describe("member role", () => {
    it("member does not meet owner requirement", () => {
      expect(hasMinRole("member", "owner")).toBe(false);
    });

    it("member does not meet admin requirement", () => {
      expect(hasMinRole("member", "admin")).toBe(false);
    });

    it("member meets member requirement", () => {
      expect(hasMinRole("member", "member")).toBe(true);
    });

    it("member meets viewer requirement", () => {
      expect(hasMinRole("member", "viewer")).toBe(true);
    });
  });

  describe("viewer role", () => {
    it("viewer does not meet owner requirement", () => {
      expect(hasMinRole("viewer", "owner")).toBe(false);
    });

    it("viewer does not meet admin requirement", () => {
      expect(hasMinRole("viewer", "admin")).toBe(false);
    });

    it("viewer does not meet member requirement", () => {
      expect(hasMinRole("viewer", "member")).toBe(false);
    });

    it("viewer meets viewer requirement", () => {
      expect(hasMinRole("viewer", "viewer")).toBe(true);
    });
  });
});

describe("hasMinProjectRole", () => {
  describe("admin role", () => {
    it("admin meets admin requirement", () => {
      expect(hasMinProjectRole("admin", "admin")).toBe(true);
    });

    it("admin meets editor requirement", () => {
      expect(hasMinProjectRole("admin", "editor")).toBe(true);
    });

    it("admin meets viewer requirement", () => {
      expect(hasMinProjectRole("admin", "viewer")).toBe(true);
    });
  });

  describe("editor role", () => {
    it("editor does not meet admin requirement", () => {
      expect(hasMinProjectRole("editor", "admin")).toBe(false);
    });

    it("editor meets editor requirement", () => {
      expect(hasMinProjectRole("editor", "editor")).toBe(true);
    });

    it("editor meets viewer requirement", () => {
      expect(hasMinProjectRole("editor", "viewer")).toBe(true);
    });
  });

  describe("viewer role", () => {
    it("viewer does not meet admin requirement", () => {
      expect(hasMinProjectRole("viewer", "admin")).toBe(false);
    });

    it("viewer does not meet editor requirement", () => {
      expect(hasMinProjectRole("viewer", "editor")).toBe(false);
    });

    it("viewer meets viewer requirement", () => {
      expect(hasMinProjectRole("viewer", "viewer")).toBe(true);
    });
  });
});

describe("canManageRole", () => {
  describe("owner as manager", () => {
    it("owner can manage admin", () => {
      expect(canManageRole("owner", "admin")).toBe(true);
    });

    it("owner can manage member", () => {
      expect(canManageRole("owner", "member")).toBe(true);
    });

    it("owner can manage viewer", () => {
      expect(canManageRole("owner", "viewer")).toBe(true);
    });

    it("owner cannot manage owner (same level)", () => {
      expect(canManageRole("owner", "owner")).toBe(false);
    });
  });

  describe("admin as manager", () => {
    it("admin cannot manage owner", () => {
      expect(canManageRole("admin", "owner")).toBe(false);
    });

    it("admin cannot manage admin (same level)", () => {
      expect(canManageRole("admin", "admin")).toBe(false);
    });

    it("admin can manage member", () => {
      expect(canManageRole("admin", "member")).toBe(true);
    });

    it("admin can manage viewer", () => {
      expect(canManageRole("admin", "viewer")).toBe(true);
    });
  });

  describe("member as manager", () => {
    it("member cannot manage owner", () => {
      expect(canManageRole("member", "owner")).toBe(false);
    });

    it("member cannot manage admin", () => {
      expect(canManageRole("member", "admin")).toBe(false);
    });

    it("member cannot manage member (same level)", () => {
      expect(canManageRole("member", "member")).toBe(false);
    });

    it("member can manage viewer", () => {
      expect(canManageRole("member", "viewer")).toBe(true);
    });
  });

  describe("viewer as manager", () => {
    it("viewer cannot manage owner", () => {
      expect(canManageRole("viewer", "owner")).toBe(false);
    });

    it("viewer cannot manage admin", () => {
      expect(canManageRole("viewer", "admin")).toBe(false);
    });

    it("viewer cannot manage member", () => {
      expect(canManageRole("viewer", "member")).toBe(false);
    });

    it("viewer cannot manage viewer (same level)", () => {
      expect(canManageRole("viewer", "viewer")).toBe(false);
    });
  });
});
