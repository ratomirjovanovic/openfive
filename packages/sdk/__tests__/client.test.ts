import { describe, it, expect } from "vitest";
import { OpenFiveClient } from "../src/client";
import { createClient } from "../src/index";

describe("OpenFiveClient", () => {
  describe("constructor", () => {
    it("creates a client instance", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
      });
      expect(client).toBeInstanceOf(OpenFiveClient);
    });

    it("uses default baseURL http://localhost:8787 when not specified", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
      });
      // The baseURL is set on the client instance via the OpenAI constructor
      expect(client.baseURL).toBe("http://localhost:8787");
    });

    it("uses custom baseURL when provided", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        baseURL: "https://gateway.openfive.io",
      });
      expect(client.baseURL).toBe("https://gateway.openfive.io");
    });
  });

  describe("gateway headers", () => {
    it("sets x-route-id header when routeId is provided", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "support_summarize",
      });
      // Access the private _gatewayHeaders through defaultHeaders
      // We can test by creating the client and checking its behavior
      // Since _gatewayHeaders is private, we verify through the defaultHeaders override
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("support_summarize");
    });

    it("sets x-agent-id header when agentId is provided", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        agentId: "my-agent",
      });
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-agent-id"]).toBe("my-agent");
    });

    it("sets x-org-id header when orgId is provided", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        orgId: "org-123",
      });
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-org-id"]).toBe("org-123");
    });

    it("sets x-max-cost-cents header as string when maxCostCents is provided", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        maxCostCents: 50,
      });
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-max-cost-cents"]).toBe("50");
    });

    it("does not set headers for undefined options", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
      });
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBeUndefined();
      expect(headers["x-agent-id"]).toBeUndefined();
      expect(headers["x-org-id"]).toBeUndefined();
      expect(headers["x-max-cost-cents"]).toBeUndefined();
    });

    it("sets all gateway headers when all options are provided", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "my-route",
        agentId: "my-agent",
        orgId: "org-456",
        maxCostCents: 100,
      });
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("my-route");
      expect(headers["x-agent-id"]).toBe("my-agent");
      expect(headers["x-org-id"]).toBe("org-456");
      expect(headers["x-max-cost-cents"]).toBe("100");
    });

    it("converts maxCostCents 0 to string '0'", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        maxCostCents: 0,
      });
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-max-cost-cents"]).toBe("0");
    });
  });

  describe("withRoute()", () => {
    it("returns a new OpenFiveClient instance", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "original-route",
      });
      const newClient = client.withRoute("new-route");
      expect(newClient).toBeInstanceOf(OpenFiveClient);
      expect(newClient).not.toBe(client);
    });

    it("new client has updated route", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "original-route",
      });
      const newClient = client.withRoute("new-route");
      const headers = (newClient as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("new-route");
    });

    it("original client retains its route", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "original-route",
      });
      client.withRoute("new-route");
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("original-route");
    });

    it("inherits other options from original client", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "original-route",
        agentId: "my-agent",
        orgId: "org-123",
      });
      const newClient = client.withRoute("new-route");
      const headers = (newClient as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("new-route");
      expect(headers["x-agent-id"]).toBe("my-agent");
      expect(headers["x-org-id"]).toBe("org-123");
    });
  });

  describe("withAgent()", () => {
    it("returns a new OpenFiveClient instance", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        agentId: "original-agent",
      });
      const newClient = client.withAgent("new-agent");
      expect(newClient).toBeInstanceOf(OpenFiveClient);
      expect(newClient).not.toBe(client);
    });

    it("new client has updated agent", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        agentId: "original-agent",
      });
      const newClient = client.withAgent("new-agent");
      const headers = (newClient as any)._gatewayHeaders;
      expect(headers["x-agent-id"]).toBe("new-agent");
    });

    it("original client retains its agent", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        agentId: "original-agent",
      });
      client.withAgent("new-agent");
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-agent-id"]).toBe("original-agent");
    });

    it("inherits other options from original client", () => {
      const client = new OpenFiveClient({
        apiKey: "sk-of_test123",
        routeId: "my-route",
        agentId: "original-agent",
        orgId: "org-123",
      });
      const newClient = client.withAgent("new-agent");
      const headers = (newClient as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("my-route");
      expect(headers["x-agent-id"]).toBe("new-agent");
      expect(headers["x-org-id"]).toBe("org-123");
    });
  });

  describe("createClient() factory function", () => {
    it("returns an OpenFiveClient instance", () => {
      const client = createClient({
        apiKey: "sk-of_test123",
      });
      expect(client).toBeInstanceOf(OpenFiveClient);
    });

    it("creates a client with the provided options", () => {
      const client = createClient({
        apiKey: "sk-of_test123",
        routeId: "test-route",
        agentId: "test-agent",
        baseURL: "https://custom.gateway.io",
      });
      expect(client.baseURL).toBe("https://custom.gateway.io");
      const headers = (client as any)._gatewayHeaders;
      expect(headers["x-route-id"]).toBe("test-route");
      expect(headers["x-agent-id"]).toBe("test-agent");
    });

    it("uses default baseURL when not provided", () => {
      const client = createClient({
        apiKey: "sk-of_test123",
      });
      expect(client.baseURL).toBe("http://localhost:8787");
    });
  });
});
