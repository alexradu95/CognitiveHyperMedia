/**
 * ✨ Create task tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the create-task tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerCreateTaskTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "create-task",
    { title: z.string(), description: z.string().optional() },
    async ({ title, description }: { title: string, description?: string }) => {
      const newTask = {
        title,
        description: description || "",
        status: "pending", 
        createdAt: new Date().toISOString()
      };
      
      const id = await store.create("task", newTask);
      
      // Ensure the ID is a string
      const taskId = typeof id === 'object' ? JSON.stringify(id) : String(id);
      
      return {
        content: [{ 
          type: "text", 
          text: `Task created with ID: ${taskId}` 
        }]
      };
    }
  );
} 