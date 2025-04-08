/**
 * 📚 Tasks collection resource for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";

/**
 * ✨ Register the tasks collection resource with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerTasksResource(server: McpServer, store: CognitiveStore): void {
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
} 