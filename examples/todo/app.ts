// Import from the framework
import { 
  DenoKvAdapter,
  CognitiveStore
} from "../../mod.ts";

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
 * ⚙️ Main entry point for the todo app.
 */
async function main() {
  try {
    // Create a persistent store adapter using Deno KV
    const kv = await Deno.openKv();
    const kvAdapter = new DenoKvAdapter(kv);
    console.error("✅ Deno KV adapter created.");

    // Initialize cognitive store with KV adapter
    const store = new CognitiveStore(kvAdapter);
    console.error("✅ Cognitive store initialized.");
    
    // Register state machine for task type
    store.registerStateMachine("task", taskStateMachineDefinition);
    console.error("✅ Task state machine registered.");

    // Start MCP server over stdio for integration with LLMs
    setupMcpServer(store).then(() => {
      console.error("✅ MCP server setup complete.");
    }).catch(e => {
      console.error("❌ Error setting up MCP server:", e);
    });
  } catch (e) {
    console.error("❌ Error in main:", e);
    Deno.exit(1);
  }
}

// Start the application
main(); 