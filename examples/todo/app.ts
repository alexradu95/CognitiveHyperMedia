// Import from the framework
import { 
  DenoKvAdapter,
  createBridge,
  CognitiveStore
} from "../../mod.ts";

// Add Protocol related imports
import { ProtocolFactory } from "../../src/adapters/protocol/protocol_factory.ts";

// Add MCP SDK imports
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";

// Import our modular components
import { taskStateMachineDefinition } from "./state_machine/index.ts";
import { registerResources } from "./resources/index.ts";
import { registerTools } from "./tools/index.ts";

// Redirect stdout to stderr for third-party libraries
// This prevents any text from interfering with MCP protocol messages
const originalConsoleLog = console.log;
console.log = (...args) => console.error(...args);

/**
 * ⚙️ Setup the MCP server with resources and tools.
 * 
 * @param store - The cognitive store instance
 * @returns The configured MCP server
 */
async function setupMcpServer(store: CognitiveStore) {
  // Create an MCP server
  const server = new McpServer({
    name: "Todo App",
    version: "1.0.0"
  });

  // Register all resources and tools
  registerResources(server, store);
  registerTools(server, store);

  // Don't log to stdout as it interferes with MCP protocol
  console.error("✅ MCP server connecting via stdio transport.");
  
  // Start receiving messages via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
}

/**
 * ⚙️ Start the HTTP server for the todo app.
 * 
 * @param store - The cognitive store instance
 * @returns The server instance
 */
async function startHttpServer(store: CognitiveStore) {
  // Create the protocol adapter using the factory
  const adapter = ProtocolFactory.createMcpAdapter(store, {
    name: "Todo App HTTP Server",
    version: "1.0.0"
  });
  
  const bridge = createBridge(store, adapter);
  console.error("✅ HTTP bridge created.");

  // --- Define HTTP Request Handler ---
  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;
    let mcpResponse: { status: number; headers?: Record<string, string>; body?: any; } | null = null;

    console.error(`➡️ ${method} ${url.pathname}${url.search}`);

    try {
      let payload: Record<string, unknown> | undefined;
      if (req.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
         try {
            payload = await req.json();
         } catch (e) {
           const errorMsg = e instanceof Error ? e.message : String(e);
           console.error("Could not parse request body as JSON:", errorMsg);
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

      if (!mcpResponse) {
        return new Response("Internal Server Error: No MCP response generated.", { status: 500 });
      }

      return new Response(JSON.stringify(mcpResponse.body || {}), {
        status: mcpResponse.status,
        headers: new Headers({
          'Content-Type': 'application/json',
          ...mcpResponse.headers
        })
      });
    } catch (error) {
      console.error("Error in HTTP handler:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };

  // Start HTTP server and listen for requests if not in Deno deploy
  Deno.serve({ port: 8000 }, handler);

  console.error("✅ HTTP Server started on http://localhost:8000");
}

/**
 * ⚙️ Main entry point for the todo app.
 */
async function main() {
  try {
    // Create a persistent store adapter using Deno KV
    const kvAdapter = new DenoKvAdapter();
    console.error("✅ Deno KV adapter created.");

    // Initialize cognitive store with KV adapter
    const store = await CognitiveStore.createStore({
      types: {
        task: {
          stateMachine: taskStateMachineDefinition
        }
      }
    }, {
      adapter: kvAdapter
    });
    console.error("✅ Cognitive store initialized.");

    // Determine if we should run HTTP server based on args
    const args = Deno.args;
    const runHttpServer = args.includes("--http");

    // Start MCP server over stdio for integration with LLMs
    setupMcpServer(store).then(() => {
      console.error("✅ MCP server setup complete.");
    }).catch(e => {
      console.error("❌ Error setting up MCP server:", e);
    });

    // Optionally start HTTP server if --http arg is provided
    if (runHttpServer) {
      startHttpServer(store).catch(e => {
        console.error("❌ Error starting HTTP server:", e);
      });
    }
  } catch (e) {
    console.error("❌ Error in main:", e);
    Deno.exit(1);
  }
}

// Start the application
main(); 