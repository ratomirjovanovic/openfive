import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatTokens,
  formatLatency,
  formatPercentage,
  formatDate,
  formatDateTime,
} from "@/lib/formatters";

describe("formatCurrency", () => {
  it("formats with default 4 decimals", () => {
    expect(formatCurrency(1.5)).toBe("$1.5000");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.0000");
  });

  it("formats with custom decimals", () => {
    expect(formatCurrency(1.5, { decimals: 2 })).toBe("$1.50");
  });

  it("formats large numbers without compact", () => {
    expect(formatCurrency(1500)).toBe("$1500.0000");
  });

  it("formats large numbers with compact mode", () => {
    expect(formatCurrency(1500, { compact: true })).toBe("$1.5k");
  });

  it("does not apply compact formatting below 1000", () => {
    expect(formatCurrency(999, { compact: true })).toBe("$999.0000");
  });

  it("formats exactly 1000 in compact mode", () => {
    expect(formatCurrency(1000, { compact: true })).toBe("$1.0k");
  });

  it("formats with both compact and custom decimals (compact takes precedence for >= 1000)", () => {
    expect(formatCurrency(2500, { compact: true, decimals: 2 })).toBe("$2.5k");
  });

  it("uses custom decimals when compact is true but amount is below 1000", () => {
    expect(formatCurrency(500, { compact: true, decimals: 2 })).toBe("$500.00");
  });

  it("formats very small amounts", () => {
    expect(formatCurrency(0.0001)).toBe("$0.0001");
  });
});

describe("formatTokens", () => {
  it("formats small numbers as-is", () => {
    expect(formatTokens(500)).toBe("500");
  });

  it("formats exactly 999 as-is", () => {
    expect(formatTokens(999)).toBe("999");
  });

  it("formats thousands with k suffix", () => {
    expect(formatTokens(1000)).toBe("1.0k");
  });

  it("formats thousands with one decimal", () => {
    expect(formatTokens(1500)).toBe("1.5k");
  });

  it("formats larger thousands", () => {
    expect(formatTokens(50000)).toBe("50.0k");
  });

  it("formats 999999 in k notation", () => {
    expect(formatTokens(999999)).toBe("1000.0k");
  });

  it("formats millions with M suffix", () => {
    expect(formatTokens(1000000)).toBe("1.0M");
  });

  it("formats millions with one decimal", () => {
    expect(formatTokens(2500000)).toBe("2.5M");
  });

  it("formats large millions", () => {
    expect(formatTokens(10000000)).toBe("10.0M");
  });

  it("formats zero", () => {
    expect(formatTokens(0)).toBe("0");
  });
});

describe("formatLatency", () => {
  it("formats milliseconds below 1000", () => {
    expect(formatLatency(500)).toBe("500ms");
  });

  it("formats zero milliseconds", () => {
    expect(formatLatency(0)).toBe("0ms");
  });

  it("formats exactly 999ms", () => {
    expect(formatLatency(999)).toBe("999ms");
  });

  it("formats 1000ms as seconds", () => {
    expect(formatLatency(1000)).toBe("1.0s");
  });

  it("formats seconds with one decimal", () => {
    expect(formatLatency(1500)).toBe("1.5s");
  });

  it("formats larger second values", () => {
    expect(formatLatency(5000)).toBe("5.0s");
  });

  it("formats fractional second values", () => {
    expect(formatLatency(2300)).toBe("2.3s");
  });
});

describe("formatPercentage", () => {
  it("formats with default 1 decimal", () => {
    expect(formatPercentage(95.5)).toBe("95.5%");
  });

  it("formats zero", () => {
    expect(formatPercentage(0)).toBe("0.0%");
  });

  it("formats 100%", () => {
    expect(formatPercentage(100)).toBe("100.0%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercentage(95.555, 2)).toBe("95.56%");
  });

  it("formats with zero decimals", () => {
    expect(formatPercentage(95.5, 0)).toBe("96%");
  });

  it("formats values over 100", () => {
    expect(formatPercentage(150.3)).toBe("150.3%");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2024-01-15T10:30:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats a Date object", () => {
    const date = new Date("2024-06-20T00:00:00Z");
    const result = formatDate(date);
    expect(result).toContain("2024");
    // Month and day depend on timezone, so just check format
    expect(result).toMatch(/\w+ \d{1,2}, \d{4}/);
  });

  it("returns a string", () => {
    expect(typeof formatDate("2024-01-01")).toBe("string");
  });
});

describe("formatDateTime", () => {
  it("formats a date string with time", () => {
    const result = formatDateTime("2024-01-15T10:30:00Z");
    // Should contain month, day, and time components
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("formats a Date object with time", () => {
    const date = new Date("2024-06-20T14:30:00Z");
    const result = formatDateTime(date);
    expect(typeof result).toBe("string");
    // The result should contain at least a colon for the time component
    expect(result).toContain(":");
  });

  it("returns a string", () => {
    expect(typeof formatDateTime("2024-01-01T00:00:00Z")).toBe("string");
  });
});
