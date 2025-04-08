/**
 * 📚 Exports all resources for the todo app.
 */
import { CognitiveStore } from "../../../mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { registerTasksResource } from "./tasks.ts";
import { registerTaskResource } from "./task.ts";

/**
 * ✨ Register all resources with the MCP server.
 * 
 * @param server - The MCP server instance
 * @param store - The cognitive store instance
 */
export function registerResources(server: McpServer, store: CognitiveStore): void {
  registerTasksResource(server, store);
  registerTaskResource(server, store);
} 