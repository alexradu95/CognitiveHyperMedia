/**
 * 📚 Exports all tools for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { registerCreateTaskTool } from "./create-task.ts";
import { registerTransitionTaskTool } from "./transition-task.ts";
import { registerDeleteTaskTool } from "./delete-task.ts";
import { registerUpdateTaskTool } from "./update-task.ts";
import { registerListTasksTool } from "./list-tasks.ts";
import { registerGetTaskTool } from "./get-task.ts";
import { registerSearchTasksTool } from "./search-tasks.ts";
import { registerGetTaskActionsTool } from "./get-task-actions.ts";
import { registerGetStateTransitionsTool } from "./get-state-transitions.ts";

/**
 * ✨ Register all tools with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerTools(server: McpServer, store: CognitiveStore): void {
  registerCreateTaskTool(server, store);
  registerTransitionTaskTool(server, store);
  registerDeleteTaskTool(server, store);
  registerUpdateTaskTool(server, store);
  registerListTasksTool(server, store);
  registerGetTaskTool(server, store);
  registerSearchTasksTool(server, store);
  registerGetTaskActionsTool(server, store);
  registerGetStateTransitionsTool(server, store);
} 