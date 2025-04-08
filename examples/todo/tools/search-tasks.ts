/**
 * ✨ Search tasks tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 🛠️ Register the search-tasks tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerSearchTasksTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "search-tasks",
    { query: z.string() },
    async ({ query }) => {
      try {
        // Get all tasks first
        const allTasks = await store.getCollection("task");
        const tasksData = allTasks.toJSON();
        
        // Simple search through title and description
        const taskItems = Array.isArray(tasksData.items) ? tasksData.items : [];
        const results = taskItems.filter((task: any) => {
          // Ensure we're looking at the correct properties, accounting for possible nesting
          let title = '';
          let description = '';
          
          // Check if title/description are directly on the task
          if (typeof task.title === 'string') {
            title = task.title.toLowerCase();
          }
          if (typeof task.description === 'string') {
            description = task.description.toLowerCase();
          }
          
          // Check if they're in task.properties
          if (task.properties) {
            if (typeof task.properties.title === 'string') {
              title = task.properties.title.toLowerCase();
            }
            if (typeof task.properties.description === 'string') {
              description = task.properties.description.toLowerCase();
            }
          }
          
          const searchQuery = query.toLowerCase();
          return title.includes(searchQuery) || description.includes(searchQuery);
        });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ items: results, count: results.length }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error searching tasks: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
} 