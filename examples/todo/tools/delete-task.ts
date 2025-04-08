/**
 * ✨ Delete task tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the delete-task tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerDeleteTaskTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "delete-task",
    { id: z.string() },
    async ({ id }) => {
      try {
        await store.delete("task", id);
        return {
          content: [{ 
            type: "text", 
            text: `Task ${id} deleted successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error deleting task: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
} 