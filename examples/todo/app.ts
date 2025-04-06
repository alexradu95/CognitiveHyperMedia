// Import from the framework
import { 
  DenoKvAdapter,
  StateMachineDefinition, 
  createBridge,
  CognitiveStore
} from "../../mod.ts";

// Add Protocol related imports
import { ProtocolFactory } from "../../src/adapters/protocol/protocol_factory.ts";

// Add MCP SDK imports
import { McpServer, ResourceTemplate } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Todo App specific state machine definition
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

async function setupMcpServer(store: CognitiveStore) {
  // Create an MCP server
  const server = new McpServer({
    name: "Todo App",
    version: "1.0.0"
  });

  // List tasks resource
  server.resource(
    "tasks",
    "tasks://list",
    async (uri: URL) => {
      const tasks = await store.getCollection("task");
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(tasks, null, 2)
        }]
      };
    }
  );

  // Get task by ID
  server.resource(
    "task",
    new ResourceTemplate("task://{id}", { list: undefined }),
    async (uri: URL, { id }: { id: string }) => {
      const task = await store.get("task", id);
      return {
        contents: [{
          uri: uri.href,
          text: task ? JSON.stringify(task, null, 2) : "Task not found"
        }]
      };
    }
  );

  // Create task tool
  server.tool(
    "create-task",
    { title: z.string(), description: z.string().optional() },
    async ({ title, description }: { title: string, description?: string }) => {
      const newTask = {
        title,
        description: description || "",
        state: "pending",
        createdAt: new Date().toISOString()
      };
      
      const id = await store.create("task", newTask);
      
      return {
        content: [{ 
          type: "text", 
          text: `Task created with ID: ${id}` 
        }]
      };
    }
  );

  // Transition task state tool
  server.tool(
    "transition-task",
    { 
      id: z.string(), 
      action: z.string()
    },
    async ({ id, action }: { id: string, action: string }) => {
      try {
        const result = await store.performAction("task", id, action);
        return {
          content: [{ 
            type: "text", 
            text: `Task ${id} transitioned with action: ${action}. New state: ${result?.getProperty("status") || "unknown"}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );

  // Start receiving messages via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("✅ MCP server connected via stdio transport.");

  return server;
}

async function startHttpServer(store: CognitiveStore) {
  // Create the protocol adapter using the factory
  const adapter = ProtocolFactory.createMcpAdapter(store, {
    name: "Todo App HTTP Server",
    version: "1.0.0"
  });
  
  const bridge = createBridge(store, adapter);
  console.log("✅ HTTP bridge created.");

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
        const uri = url.pathname + url.search; // Pass full URI with query params
        mcpResponse = await bridge.explore(uri);
      } else if (method === 'POST') {
        if (pathParts.length === 1) {
          // Create Resource
           if (!payload) {
                mcpResponse = { status: 400, body: { error: "Missing request body for create" } };
           } else {
                const uri = url.pathname;
                mcpResponse = await bridge.create(uri, payload);
           }
        } else if (pathParts.length === 3) {
          // Act on Resource (/type/id/action)
          const type = pathParts[0];
          const id = pathParts[1];
          const actionName = pathParts[2];

          const uri = `/${type}/${id}`;
          mcpResponse = await bridge.act(uri, actionName, payload);
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
  Deno.serve({ port, handler });
}

async function main() {
  console.log("🚀 Starting Todo App...");

  // --- Initialize Dependencies ---
  let kv;
  try {
    // Try the current API first
    kv = await Deno.openKv(); 
  } catch (error: unknown) {
    console.error("Error initializing KV:", error instanceof Error ? error.message : String(error));
    console.log("Please make sure you're using the latest Deno version and running with --unstable-kv flag");
    console.log("If problems persist, check the Deno KV documentation for API changes");
    Deno.exit(1);
  }
  const kvAdapter = new DenoKvAdapter(kv);
  const store = new CognitiveStore(kvAdapter);
  
  // --- Register State Machines ---
  store.registerStateMachine("task", taskStateMachineDefinition);
  console.log("✅ State machines registered.");

  // Determine which server type to start based on environment variable
  const serverType = Deno.env.get("SERVER_TYPE") || "mcp";
  
  if (serverType === "http") {
    await startHttpServer(store);
  } else {
    // Default to MCP server for Claude Desktop integration
    await setupMcpServer(store);
  }
}

// Run the main function
if (import.meta.main) {
  main().catch((err) => {
    console.error("💥 Server failed to start:", err);
    Deno.exit(1);
  });
} 