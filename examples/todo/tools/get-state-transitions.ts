/**
 * ✨ Get state transitions tool for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { taskStateMachineDefinition } from "../state_machine/task.ts";

/**
 * 🛠️ Register the get-state-transitions tool with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerGetStateTransitionsTool(server: McpServer, store: CognitiveStore): void {
  server.tool(
    "get-state-transitions",
    { state: z.string() },
    async ({ state }) => {
      try {
        // Get state machine definition directly
        const stateMachine = taskStateMachineDefinition;
        
        if (!stateMachine || !stateMachine.states[state]) {
          return {
            content: [{ type: "text", text: `Invalid state: ${state}` }],
            isError: true
          };
        }
        
        const stateInfo = stateMachine.states[state];
        const transitions = stateInfo.transitions || {};
        
        // Format transitions for nicer display
        const formattedTransitions = Object.entries(transitions).map(([action, targetInfo]) => {
          const target = targetInfo as { target: string };
          return {
            action,
            targetState: target.target,
            targetDescription: stateMachine.states[target.target]?.description || ''
          };
        });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              currentState: state,
              stateDescription: stateInfo.description,
              possibleTransitions: formattedTransitions
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting state transitions: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
} 