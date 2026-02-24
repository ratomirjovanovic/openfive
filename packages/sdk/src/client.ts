import OpenAI from "openai";

export interface OpenFiveClientOptions {
  apiKey: string;
  baseURL: string;
  orgId?: string;
  projectId?: string;
  envId?: string;
  routeId?: string;
  agentId?: string;
}

export class OpenFiveClient extends OpenAI {
  private gatewayHeaders: Record<string, string>;

  constructor(opts: OpenFiveClientOptions) {
    super({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL,
    });

    this.gatewayHeaders = {};
    if (opts.orgId) this.gatewayHeaders["x-org-id"] = opts.orgId;
    if (opts.projectId) this.gatewayHeaders["x-project-id"] = opts.projectId;
    if (opts.envId) this.gatewayHeaders["x-env-id"] = opts.envId;
    if (opts.routeId) this.gatewayHeaders["x-route-id"] = opts.routeId;
    if (opts.agentId) this.gatewayHeaders["x-agent-id"] = opts.agentId;
  }

  protected override defaultHeaders(): Record<string, string> {
    return {
      ...super.defaultHeaders(),
      ...this.gatewayHeaders,
    };
  }
}
