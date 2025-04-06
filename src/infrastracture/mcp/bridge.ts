import {
    McpServer,
    McpServerTransport,
  } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { z } from "zod";
  import { CognitiveStore, CollectionOptions } from "../store/store.ts";
  import { CognitiveError } from "../core/types.ts";
  import { McpError, ResourceNotFoundError } from "../core/errors.ts";
  import { CognitiveResource } from "../core/resource.ts";
  import { CognitiveCollection } from "../core/collection.ts";
  
  // --- Simplified MCP Types (Replace with SDK types if available) ---
  
  interface McpCommandBase {
    uri: string; // Resource URI (e.g., /tasks/task-123, /tasks?color=red)
  }
  
  interface McpExploreCommand extends McpCommandBase {}
  
  interface McpActCommand extends McpCommandBase {
    action: string;
    payload?: Record<string, unknown>;
  }
  
  interface McpCreateCommand extends McpCommandBase { // URI likely just /type
    payload: Record<string, unknown>;
  }
  
  type McpCommand = McpExploreCommand | McpActCommand | McpCreateCommand;
  
  interface McpResponse {
    status: number; // e.g., 200, 201, 400, 404, 500
    headers?: Record<string, string>; // e.g., { Location: "/tasks/new-id" }
    body?: any; // Formatted CognitiveResource, CognitiveCollection, or error details
  }
  
  // --- End Simplified MCP Types ---
  
  /**
   * 🌉 Connects the CognitiveStore to the MCP server, handling tool requests.
   */
  export class CognitiveMcpBridge {
    private store: CognitiveStore;
    private mcp: McpServer;
  
    constructor(store: CognitiveStore, mcp: McpServer) {
      this.store = store;
      this.mcp = mcp;
    }
  
    /**
     * ⚙️ Registers the standard Cognitive Hypermedia MCP tools.
     */
    registerTools() {
      this.registerExploreTool();
      this.registerActTool();
      this.registerCreateTool();
      // Register search, aggregate etc. as needed
    }
  
    private registerExploreTool(): void {
      this.mcp.tool(
        "explore",
        z.object({
          concept: z.string().describe("Resource type to explore"),
          id: z.string().optional().describe("Specific resource ID"),
          filter: z.record(z.any()).optional().describe("Filter criteria"),
          pagination: z.object({
            page: z.number().optional(),
            pageSize: z.number().optional(),
          }).optional().describe("Pagination options"),
          // Add include, view etc. based on white paper
        }).describe("Navigate and explore resources and collections"),
        async (params: { id: string; concept: string; filter: any; pagination: { page: any; pageSize: any; }; }) => {
          try {
            let result;
            if (params.id) {
              result = await this.store.get(params.concept, params.id);
              if (!result) {
                throw new ResourceNotFoundError(params.concept, params.id);
              }
            } else {
              result = await this.store.getCollection(params.concept, {
                filter: params.filter,
                page: params.pagination?.page,
                pageSize: params.pagination?.pageSize,
              });
            }
            return {
              content: [{
                type: "text",
                // Pretty print for readability during debug, consider compact in prod
                text: JSON.stringify(result, null, 2),
              }],
            };
          } catch (error) {
            return this.handleMcpError(error, "explore");
          }
        },
      );
    }
  
    private registerActTool(): void {
      this.mcp.tool(
        "act",
        z.object({
          concept: z.string().describe("Resource type"),
          id: z.string().describe("Resource ID"),
          action: z.string().describe("Action to perform"),
          parameters: z.record(z.any()).optional().describe(
            "Action parameters",
          ),
        }).describe("Perform actions on resources"),
        async (params: { concept: string; id: string; action: string; parameters: Record<string, unknown> | undefined; }) => {
          try {
            const result = await this.store.performAction(
              params.concept,
              params.id,
              params.action,
              params.parameters,
            );
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
              }],
            };
          } catch (error) {
            return this.handleMcpError(error, "act");
          }
        },
      );
    }
  
    private registerCreateTool(): void {
      this.mcp.tool(
        "create",
        z.object({
          concept: z.string().describe("Resource type to create"),
          data: z.record(z.any()).describe("Resource data"),
        }).describe("Create new resources"),
        async (params: { concept: string; data: Record<string, unknown>; }) => {
          try {
            const result = await this.store.create(
              params.concept,
              params.data,
            );
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
              }],
            };
          } catch (error) {
            return this.handleMcpError(error, "create");
          }
        },
      );
    }
  
    /**
     * 🚨 Handles errors during MCP tool execution and formats them.
     */
    private handleMcpError(
      error: unknown,
      toolName: string,
    ): { content: Array<{ type: string; text: string }>; isError: boolean } {
      console.error(`Error in MCP tool '${toolName}':`, error);
  
      let cognitiveError: CognitiveError;
  
      if (error instanceof ResourceNotFoundError) {
        cognitiveError = {
          _type: "error",
          code: "resource_not_found",
          message: error.message,
        };
      } else if (error instanceof McpError) {
        cognitiveError = {
          _type: "error",
          code: error.code || `${toolName}_error`,
          message: error.message,
        };
      } else if (error instanceof Error) {
        cognitiveError = {
          _type: "error",
          code: `${toolName}_execution_error`,
          message: `Failed to execute ${toolName}: ${error.message}`,
          details: { stack: error.stack },
        };
      } else {
        cognitiveError = {
          _type: "error",
          code: "unknown_error",
          message: `An unknown error occurred during ${toolName} execution.`,
        };
      }
  
      return {
        content: [{
          type: "text",
          text: JSON.stringify(cognitiveError, null, 2),
        }],
        isError: true,
      };
    }
  }

  /**
   * ✨ Creates handlers for processing MCP commands against a CognitiveStore.
   * Acts as a translation layer between the MCP protocol and the store's interface.
   */
  export function createMcpBridge(store: CognitiveStore) {

    /**
     * 🗺️ Handles the MCP 'explore' command.
     * Retrieves a single resource or a collection based on the URI.
     */
    async function handleExplore(command: McpExploreCommand): Promise<McpResponse> {
      console.log("Handling explore:", command);
      try {
        const url = new URL(command.uri, "http://localhost"); // Base URL is needed for URL parsing
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (pathParts.length === 2) {
          // --- Single Resource Request ---
          const type = pathParts[0];
          const id = pathParts[1];
          if (!type || !id) {
             return { status: 400, body: { error: "Invalid URI path for explore. Expected /type/id." } };
          }

          const resource = await store.get(type, id);

          if (resource) {
            return { status: 200, body: resource.toJSON() };
          } else {
            return { status: 404, body: { error: `Resource ${type}/${id} not found.` } };
          }
        } else if (pathParts.length === 1) {
          // --- Collection Request ---
          const type = pathParts[0];
          if (!type) {
            return { status: 400, body: { error: "Invalid URI path for explore. Expected /type or /type?params..." } };
          }

          // Parse query parameters into CollectionOptions
          const options: CollectionOptions = {};
          const filter: Record<string, unknown> = {};
          for (const [key, value] of url.searchParams.entries()) {
            if (key === "page") {
              const pageNum = parseInt(value, 10);
              if (!isNaN(pageNum) && pageNum > 0) options.page = pageNum;
            } else if (key === "pageSize") {
              const sizeNum = parseInt(value, 10);
              if (!isNaN(sizeNum) && sizeNum > 0) options.pageSize = sizeNum;
            } else {
              // Assume other params are filters (simple equality for now)
              // TODO: Handle more complex filter operators (gt, lt, contains etc.)
              filter[key] = value;
            }
          }
          if (Object.keys(filter).length > 0) {
            options.filter = filter;
          }

          const collection = await store.getCollection(type, options);
          return { status: 200, body: collection.toJSON() };

        } else {
          // Invalid URI path structure
          return { status: 400, body: { error: "Invalid URI path for explore. Expected /type/id or /type?params..." } };
        }

      } catch (error) {
        console.error("Error in handleExplore:", error);
        // TODO: Differentiate error types
        return {
          status: 500,
          body: { error: error instanceof Error ? error.message : "An unknown error occurred during exploration." },
        };
      }
    }

    /**
     * ⚡ Handles the MCP 'act' command.
     * Executes an action on a specific resource.
     */
    async function handleAct(command: McpActCommand): Promise<McpResponse> {
      console.log("Handling act:", command);
      try {
        // 1. Parse URI to get type and ID
        const uriParts = command.uri.split('/').filter(Boolean);
        if (uriParts.length !== 2 || !uriParts[0] || !uriParts[1]) {
          return { status: 400, body: { error: "Invalid URI for act. Expected /type/id." } };
        }
        const type = uriParts[0];
        const id = uriParts[1];

        // 2. Extract action name and payload
        const actionName = command.action;
        const payload = command.payload;
        if (!actionName) {
           return { status: 400, body: { error: "Action name is required for act." } };
        }

        // 3. Call store.performAction()
        const resultResource = await store.performAction(type, id, actionName, payload);

        // 4. Format successful response
        if (resultResource) {
          // Action returned an updated resource
          return {
            status: 200,
            body: resultResource.toJSON(),
          };
        } else {
          // Action resulted in deletion or no content response
          return {
            status: 204, // No Content
          };
        }

      } catch (error) {
        // 5. Handle errors
        console.error("Error in handleAct:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";

        if (errorMessage.includes("not found")) {
           return { status: 404, body: { error: errorMessage } };
        } else if (errorMessage.includes("not allowed in the current state")) {
           return { status: 403, body: { error: errorMessage } }; // Forbidden
        } else if (errorMessage.includes("Payload is required")) {
           return { status: 400, body: { error: errorMessage } }; // Bad Request
        }
        // TODO: Add more specific error handling based on custom error types if defined

        return { status: 500, body: { error: errorMessage } };
      }
    }

    /**
     * ➕ Handles the MCP 'create' command.
     * Creates a new resource of a specified type.
     */
    async function handleCreate(command: McpCreateCommand): Promise<McpResponse> {
      console.log("Handling create:", command);
      try {
        // 1. Parse URI to get type (simple parsing for now)
        const uriParts = command.uri.split('/').filter(Boolean); // Filter out empty strings from leading/trailing slashes
        if (uriParts.length !== 1 || !uriParts[0]) {
          return { status: 400, body: { error: "Invalid URI for create. Expected /type." } };
        }
        const type = uriParts[0];

        // 2. Extract payload
        const payload = command.payload;
        if (!payload || Object.keys(payload).length === 0) {
           return { status: 400, body: { error: "Payload is required for create." } };
        }

        // 3. Call store.create()
        const createdResource = await store.create(type, payload);

        // 4. Format successful response
        const resourceUri = `/${type}/${createdResource.getId()}`;
        return {
          status: 201,
          headers: { Location: resourceUri },
          body: createdResource.toJSON(), // Serialize the created resource
        };

      } catch (error) {
        // 5. Handle errors
        console.error("Error in handleCreate:", error);
        // TODO: Differentiate error types (e.g., validation vs. server error)
        return {
          status: 500, // Default to 500 for now
          body: { error: error instanceof Error ? error.message : "An unknown error occurred during creation." },
        };
      }
    }

    return {
      handleExplore,
      handleAct,
      handleCreate,
    };
  }

  export type McpBridge = ReturnType<typeof createMcpBridge>;

  // Example Usage (conceptual)
  // const store = new CognitiveStore(...);
  // const bridge = createMcpBridge(store);
  // const mcpResponse = await bridge.handleExplore({ uri: "/tasks/task-123" });