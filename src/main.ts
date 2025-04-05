import { CognitiveStore } from "./store/store.ts";
import { createMcpBridge, McpBridge } from "./mcp/bridge.ts";
import { StateMachineDefinition } from "./core/statemachine.ts";

// --- Define or Import State Machines ---
// TODO: Move this to a dedicated configuration/definition file
const taskStateMachineDefinition: StateMachineDefinition = {
  initialState: "pending",
  states: {
    pending: { name: "pending", description: "Task is waiting.", allowedActions: { start: {description: "Start"}, cancel: {description: "Cancel"} }, transitions: { start: { target: "inProgress" }, cancel: { target: "cancelled" } } },
    inProgress: { name: "inProgress", description: "Task is active.", allowedActions: { complete: {description: "Complete"}, block: {description: "Block"} }, transitions: { complete: { target: "completed" }, block: { target: "blocked" } } },
    blocked: { name: "blocked", description: "Task is blocked.", allowedActions: { unblock: {description: "Unblock"}, cancel: {description: "Cancel"} }, transitions: { unblock: { target: "inProgress" }, cancel: { target: "cancelled" } } },
    completed: { name: "completed", description: "Task is done.", allowedActions: { archive: {description: "Archive"} }, transitions: { archive: { target: "archived" } } },
    cancelled: { name: "cancelled", description: "Task cancelled.", allowedActions: {} },
    archived: { name: "archived", description: "Task archived.", allowedActions: {} },
  },
};
// ---

async function main() {
  console.log("🚀 Starting Cognitive Hypermedia Server...");

  // --- Initialize Dependencies ---
  const kv = await Deno.openKv(); // Use default persistent KV or specify path ":memory:"
  const store = new CognitiveStore(kv);
  const bridge = createMcpBridge(store);

  // --- Register State Machines ---
  store.registerStateMachine("task", taskStateMachineDefinition);
  console.log("✅ State machines registered.");

  // --- Define HTTP Request Handler ---
  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;
    let mcpResponse: { status: number; headers?: Record<string, string>; body?: any; } | null = null;

    console.log(`➡️ ${method} ${url.pathname}${url.search}`);

    try {
      let payload: Record<string, unknown> | undefined;
      if (req.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
         try {
            payload = await req.json();
         } catch (e) {
           const errorMsg = e instanceof Error ? e.message : String(e);
           console.warn("Could not parse request body as JSON:", errorMsg);
           payload = undefined; // Treat as empty payload if parsing fails
         }
      }

      // --- MCP Command Routing based on Method and Path ---
      if (method === 'GET') {
        // Explore (Resource or Collection)
        const command = { uri: url.pathname + url.search }; // Pass full URI with query params
        mcpResponse = await bridge.handleExplore(command);
      } else if (method === 'POST') {
        if (pathParts.length === 1) {
          // Create Resource
           if (!payload) {
                mcpResponse = { status: 400, body: { error: "Missing request body for create" } };
           } else {
                const command = { uri: url.pathname, payload };
                mcpResponse = await bridge.handleCreate(command);
           }
        } else if (pathParts.length === 3) {
          // Act on Resource (/type/id/action)
          const type = pathParts[0];
          const id = pathParts[1];
          const actionName = pathParts[2];
          const command = { uri: `/${type}/${id}`, action: actionName, payload }; // Construct URI without action
          mcpResponse = await bridge.handleAct(command);
        } else {
           mcpResponse = { status: 400, body: { error: "Invalid POST request path. Use /type for create or /type/id/action for act." } };
        }
      } else {
         mcpResponse = { status: 405, body: { error: `Method ${method} not allowed.` } };
      }

    } catch (err) {
        console.error("🚨 Unexpected error during request handling:", err);
        mcpResponse = { status: 500, body: { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) } };
    }

    // --- Construct HTTP Response ---
    const headers = new Headers({ "Content-Type": "application/json" });
    if (mcpResponse?.headers) {
        for (const [key, value] of Object.entries(mcpResponse.headers)) {
            headers.set(key, value);
        }
    }

    console.log(`⬅️ ${mcpResponse?.status || 500}`);

    return new Response(
        mcpResponse?.body ? JSON.stringify(mcpResponse.body, null, 2) : null, // Pretty print body
        {
            status: mcpResponse?.status || 500,
            headers: headers,
        }
    );
  };

  // --- Start Server ---
  const port = 8000;
  console.log(`👂 Listening on http://localhost:${port}`);
  await Deno.serve({ port }, handler);
}

// Run the main function
main().catch((err) => {
  console.error("💥 Server failed to start:", err);
  Deno.exit(1);
});