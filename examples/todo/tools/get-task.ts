/**
 * ✨ Get task tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the get-task tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerGetTaskTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "get-task",
    { id: z.string() },
    async ({ id }) => {
      try {
        const task = await store.get("task", id);
        
        if (!task) {
          return {
            content: [{ type: "text", text: `Task ${id} not found` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(task.toJSON(), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting task: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
} 