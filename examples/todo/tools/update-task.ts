/**
 * ✨ Update task tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the update-task tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerUpdateTaskTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "update-task",
    { 
      id: z.string(), 
      title: z.string().optional(), 
      description: z.string().optional() 
    },
    async ({ id, title, description }) => {
      try {
        const task = await store.get("task", id);
        if (!task) {
          return {
            content: [{ type: "text", text: `Task ${id} not found` }],
            isError: true
          };
        }

        // Create update object with only the fields that need to be updated
        const updates: Record<string, any> = {};
        
        // Only update specified fields
        if (title !== undefined) {
          updates.title = title;
        }
        if (description !== undefined) {
          updates.description = description;
        }

        // Update the task directly with the updates object
        await store.update("task", id, updates);

        return {
          content: [{ 
            type: "text", 
            text: `Task ${id} updated successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error updating task: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );
} 