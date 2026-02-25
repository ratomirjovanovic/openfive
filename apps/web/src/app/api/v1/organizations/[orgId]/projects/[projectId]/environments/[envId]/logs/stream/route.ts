import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { errorResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const url = new URL(request.url);
    const routeId = url.searchParams.get("route_id");
    const status = url.searchParams.get("status");

    let lastCheckedAt = new Date().toISOString();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        const poll = async () => {
          try {
            let query = supabase
              .from("requests")
              .select("*")
              .eq("environment_id", envId)
              .gt("created_at", lastCheckedAt)
              .order("created_at", { ascending: true });

            if (routeId) query = query.eq("route_id", routeId);
            if (status) query = query.eq("status", status);

            const { data, error } = await query;

            if (error) {
              sendEvent({ type: "error", message: error.message });
              return;
            }

            if (data && data.length > 0) {
              for (const record of data) {
                sendEvent({ type: "request", data: record });
              }
              lastCheckedAt = data[data.length - 1].created_at;
            }
          } catch {
            // Connection may have been closed
          }
        };

        // Send initial heartbeat
        controller.enqueue(encoder.encode(": heartbeat\n\n"));

        // Poll every 2 seconds
        const intervalId = setInterval(poll, 2000);

        // Run first poll immediately
        await poll();

        // Cleanup on abort
        request.signal.addEventListener("abort", () => {
          clearInterval(intervalId);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
