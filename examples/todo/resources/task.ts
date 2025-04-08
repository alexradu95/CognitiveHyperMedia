/**
 * 📚 Individual task resource for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer, ResourceTemplate } from "npm:@modelcontextprotocol/sdk/server/mcp.js";

/**
 * ✨ Register the individual task resource with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerTaskResource(server: McpServer, store: CognitiveStore): void {
  // Get task by ID - Using ResourceTemplate
  const taskTemplate = new ResourceTemplate("task://{id}", { list: undefined });
  server.resource(
    "task",
    taskTemplate,
    async (uri: URL, variables) => {
      // Ensure we have a string ID by converting if needed
      const taskId = String(variables.id);
      const task = await store.get("task", taskId);
      return {
        contents: [{
          uri: uri.href,
          text: task ? JSON.stringify(task, null, 2) : "Task not found"
        }]
      };
    }
  );
} 