import { describe, it, expect } from "vitest";
import {
  MEMBERSHIP_ROLES,
  PROJECT_ROLES,
  ENVIRONMENT_TIERS,
  PROVIDER_TYPES,
  STATUS_VARIANTS,
  DEFAULT_BUDGET_WINDOW,
  DEFAULT_ANOMALY_MULTIPLIER,
  DEFAULT_ANOMALY_WINDOW_MINUTES,
  DEFAULT_SCORING_WEIGHTS,
} from "../src/constants";

describe("MEMBERSHIP_ROLES", () => {
  it("contains exactly four roles in the correct order", () => {
    expect(MEMBERSHIP_ROLES).toEqual(["owner", "admin", "member", "viewer"]);
  });

  it("has length 4", () => {
    expect(MEMBERSHIP_ROLES).toHaveLength(4);
  });

  it("includes owner role", () => {
    expect(MEMBERSHIP_ROLES).toContain("owner");
  });

  it("includes admin role", () => {
    expect(MEMBERSHIP_ROLES).toContain("admin");
  });

  it("includes member role", () => {
    expect(MEMBERSHIP_ROLES).toContain("member");
  });

  it("includes viewer role", () => {
    expect(MEMBERSHIP_ROLES).toContain("viewer");
  });
});

describe("PROJECT_ROLES", () => {
  it("contains exactly three roles in the correct order", () => {
    expect(PROJECT_ROLES).toEqual(["admin", "editor", "viewer"]);
  });

  it("has length 3", () => {
    expect(PROJECT_ROLES).toHaveLength(3);
  });

  it("includes admin role", () => {
    expect(PROJECT_ROLES).toContain("admin");
  });

  it("includes editor role", () => {
    expect(PROJECT_ROLES).toContain("editor");
  });

  it("includes viewer role", () => {
    expect(PROJECT_ROLES).toContain("viewer");
  });
});

describe("ENVIRONMENT_TIERS", () => {
  it("contains exactly three tiers in the correct order", () => {
    expect(ENVIRONMENT_TIERS).toEqual([
      "development",
      "staging",
      "production",
    ]);
  });

  it("has length 3", () => {
    expect(ENVIRONMENT_TIERS).toHaveLength(3);
  });

  it("includes development tier", () => {
    expect(ENVIRONMENT_TIERS).toContain("development");
  });

  it("includes staging tier", () => {
    expect(ENVIRONMENT_TIERS).toContain("staging");
  });

  it("includes production tier", () => {
    expect(ENVIRONMENT_TIERS).toContain("production");
  });
});

describe("PROVIDER_TYPES", () => {
  it("contains exactly three provider types", () => {
    expect(PROVIDER_TYPES).toEqual([
      "openrouter",
      "ollama",
      "openai_compatible",
    ]);
  });

  it("has length 3", () => {
    expect(PROVIDER_TYPES).toHaveLength(3);
  });

  it("includes openrouter", () => {
    expect(PROVIDER_TYPES).toContain("openrouter");
  });

  it("includes ollama", () => {
    expect(PROVIDER_TYPES).toContain("ollama");
  });

  it("includes openai_compatible", () => {
    expect(PROVIDER_TYPES).toContain("openai_compatible");
  });
});

describe("STATUS_VARIANTS", () => {
  it("is a non-empty object", () => {
    expect(Object.keys(STATUS_VARIANTS).length).toBeGreaterThan(0);
  });

  it("contains all expected status keys", () => {
    const expectedKeys = [
      "ok",
      "degraded",
      "blocked",
      "throttled",
      "fallback",
      "repair",
    ];
    expect(Object.keys(STATUS_VARIANTS)).toEqual(expectedKeys);
  });

  it("has correct ok variant", () => {
    expect(STATUS_VARIANTS.ok).toEqual({ label: "OK", color: "green" });
  });

  it("has correct degraded variant", () => {
    expect(STATUS_VARIANTS.degraded).toEqual({
      label: "Degraded",
      color: "yellow",
    });
  });

  it("has correct blocked variant", () => {
    expect(STATUS_VARIANTS.blocked).toEqual({
      label: "Blocked",
      color: "red",
    });
  });

  it("has correct throttled variant", () => {
    expect(STATUS_VARIANTS.throttled).toEqual({
      label: "Throttled",
      color: "orange",
    });
  });

  it("has correct fallback variant", () => {
    expect(STATUS_VARIANTS.fallback).toEqual({
      label: "Fallback",
      color: "blue",
    });
  });

  it("has correct repair variant", () => {
    expect(STATUS_VARIANTS.repair).toEqual({
      label: "Repair",
      color: "purple",
    });
  });

  it("every variant has a label and color", () => {
    for (const [, variant] of Object.entries(STATUS_VARIANTS)) {
      expect(variant).toHaveProperty("label");
      expect(variant).toHaveProperty("color");
      expect(typeof variant.label).toBe("string");
      expect(typeof variant.color).toBe("string");
      expect(variant.label.length).toBeGreaterThan(0);
      expect(variant.color.length).toBeGreaterThan(0);
    }
  });
});

describe("Default values", () => {
  it("DEFAULT_BUDGET_WINDOW is '1 month'", () => {
    expect(DEFAULT_BUDGET_WINDOW).toBe("1 month");
  });

  it("DEFAULT_BUDGET_WINDOW is a non-empty string", () => {
    expect(typeof DEFAULT_BUDGET_WINDOW).toBe("string");
    expect(DEFAULT_BUDGET_WINDOW.length).toBeGreaterThan(0);
  });

  it("DEFAULT_ANOMALY_MULTIPLIER is 3.0", () => {
    expect(DEFAULT_ANOMALY_MULTIPLIER).toBe(3.0);
  });

  it("DEFAULT_ANOMALY_MULTIPLIER is a positive number", () => {
    expect(typeof DEFAULT_ANOMALY_MULTIPLIER).toBe("number");
    expect(DEFAULT_ANOMALY_MULTIPLIER).toBeGreaterThan(0);
  });

  it("DEFAULT_ANOMALY_WINDOW_MINUTES is 5", () => {
    expect(DEFAULT_ANOMALY_WINDOW_MINUTES).toBe(5);
  });

  it("DEFAULT_ANOMALY_WINDOW_MINUTES is a positive integer", () => {
    expect(typeof DEFAULT_ANOMALY_WINDOW_MINUTES).toBe("number");
    expect(DEFAULT_ANOMALY_WINDOW_MINUTES).toBeGreaterThan(0);
    expect(Number.isInteger(DEFAULT_ANOMALY_WINDOW_MINUTES)).toBe(true);
  });
});

describe("DEFAULT_SCORING_WEIGHTS", () => {
  it("has cost, latency, and reliability weights", () => {
    expect(DEFAULT_SCORING_WEIGHTS).toHaveProperty("cost");
    expect(DEFAULT_SCORING_WEIGHTS).toHaveProperty("latency");
    expect(DEFAULT_SCORING_WEIGHTS).toHaveProperty("reliability");
  });

  it("has correct weight values", () => {
    expect(DEFAULT_SCORING_WEIGHTS.cost).toBe(0.4);
    expect(DEFAULT_SCORING_WEIGHTS.latency).toBe(0.3);
    expect(DEFAULT_SCORING_WEIGHTS.reliability).toBe(0.3);
  });

  it("weights sum to 1.0", () => {
    const sum =
      DEFAULT_SCORING_WEIGHTS.cost +
      DEFAULT_SCORING_WEIGHTS.latency +
      DEFAULT_SCORING_WEIGHTS.reliability;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("all weights are positive numbers", () => {
    expect(DEFAULT_SCORING_WEIGHTS.cost).toBeGreaterThan(0);
    expect(DEFAULT_SCORING_WEIGHTS.latency).toBeGreaterThan(0);
    expect(DEFAULT_SCORING_WEIGHTS.reliability).toBeGreaterThan(0);
  });
});
