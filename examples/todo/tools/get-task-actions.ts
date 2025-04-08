/**
 * ✨ Get task actions tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { taskStateMachineDefinition } from "../state_machine/task.ts";

/**
 * 🛠️ Register the get-task-actions tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerGetTaskActionsTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "get-task-actions",
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
        
        // Change from "state" to "status" to match what performAction uses
        const currentState = task.getProperty("status") as string || task.getProperty("state") as string;
        // Get state machine definition from task's metadata
        const stateMachine = taskStateMachineDefinition;
        
        if (!stateMachine || !stateMachine.states[currentState]) {
          return {
            content: [{ type: "text", text: `Invalid state machine or state: ${currentState}` }],
            isError: true
          };
        }
        
        const availableActions = stateMachine.states[currentState].allowedActions;
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(availableActions, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting available actions: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
} 