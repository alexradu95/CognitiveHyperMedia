// Import all components from the framework
import { 
  CognitiveStore,
  StorageFactory,
  createBridge,
  // MCP components now available directly from the framework
  McpServer,
  StdioServerTransport
} from "../../mod.ts";

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
    // Create a cognitive store with Deno KV storage in one step
    const store = await StorageFactory.createStore();
    console.error("✅ Cognitive store initialized with Deno KV.");
    
    // Create a bridge for the store
    const bridge = createBridge(store);
    console.error("✅ Cognitive bridge created.");
    
    // Register state machine for task type
    store.registerStateMachine("task", taskStateMachineDefinition);
    console.error("✅ Task state machine registered.");

    // Start MCP server over stdio for integration with LLMs
    try {
      const server = await setupMcpServer(store);
      console.error("✅ MCP server setup complete.");
      
      // Set up cleanup on exit
      const cleanup = () => {
        console.error("Shutting down MCP server...");
        
        // Attempt to gracefully close the server if methods are available
        try {
          // Use type assertion to bypass TypeScript checking
          const serverAny = server as any;
          
          // The MCP SDK may have either close() or disconnect()
          if (typeof serverAny.close === "function") {
            serverAny.close();
          } else if (typeof serverAny.disconnect === "function") {
            serverAny.disconnect();
          } else {
            console.error("No close/disconnect method found on MCP server");
          }
        } catch (error) {
          console.error("Error closing MCP server:", error);
        }
        
        // Always restore original console.log
        console.log = originalConsoleLog;
      };
      
      // Only add signal handlers for Windows-supported signals
      Deno.addSignalListener("SIGINT", cleanup);  // Ctrl+C
      
      // On Windows, also add SIGBREAK if this code is running on Windows
      if (Deno.build.os === "windows") {
        Deno.addSignalListener("SIGBREAK", cleanup);  // Ctrl+Break
      }
      
    } catch (error: unknown) {
      console.error("❌ Error setting up MCP server:", error);
      throw error; // Re-throw to be caught by outer try/catch
    }
  } catch (error: unknown) {
    console.error("❌ Error in main:", error);
    console.log = originalConsoleLog; // Restore on error
    Deno.exit(1);
  }
}

// Start the application
main(); 