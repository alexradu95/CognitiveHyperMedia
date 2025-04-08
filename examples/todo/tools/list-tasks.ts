/**
 * ✨ List tasks tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the list-tasks tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerListTasksTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "list-tasks",
    { 
      state: z.string().optional(),
      limit: z.number().optional()
    },
    async ({ state, limit = 10 }) => {
      try {
        const options: Record<string, unknown> = { 
          pageSize: limit 
        };
        
        // Add state filter if provided
        if (state) {
          options.filter = { state };
        }
        
        const tasks = await store.getCollection("task", options);
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(tasks.toJSON(), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
} 