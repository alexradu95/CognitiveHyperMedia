/**
 * ✨ Example showing how to import MCP components from the framework
 */

// Instead of this:
// import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";

// Use this unified import:
import { 
  // Core framework components
  CognitiveStore,
  StorageFactory,
  createBridge,
  
  // MCP components (now re-exported through the framework)
  McpServer,
  StdioServerTransport
} from "../mod.ts";

// Now you can use the components as before
const server = new McpServer({
  name: "Example App",
  version: "1.0.0"
});

const transport = new StdioServerTransport();
// ...rest of your application code 