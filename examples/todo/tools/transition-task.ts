/**
 * ✨ Transition task tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the transition-task tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerTransitionTaskTool(server: McpServer, store: CognitiveStore): void {
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
} 