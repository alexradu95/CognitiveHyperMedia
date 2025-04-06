import { McpServer, McpServerTransport } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CognitiveStore } from "../store/store.ts";
import { IProtocolAdapter, ProtocolResponse, ProtocolError } from "./protocol_adapter.ts";
import { ResourceNotFoundError, McpError } from "../core/errors.ts";
import { CognitiveError } from "../core/types.ts";

/**
 * 🌉 MCP-specific implementation of the protocol adapter.
 * Handles communication using the Model Context Protocol.
 */
export class McpProtocolAdapter implements IProtocolAdapter {
  private store: CognitiveStore;
  private mcp: McpServer;
  private transport: McpServerTransport | null = null;
  private toolsRegistered = false;

  /**
   * Create a new MCP protocol adapter.
   * 
   * @param store - CognitiveStore instance to connect to
   * @param options - MCP-specific options
   */
  constructor(store: CognitiveStore, options: McpAdapterOptions = {}) {
    this.store = store;
    this.mcp = new McpServer({
      name: options.name || "Cognitive Hypermedia",
      version: options.version || "1.0.0"
    });
  }

  /**
   * 🔄 Connect this adapter to its transport layer
   */
  async connect(): Promise<void> {
    if (!this.transport) {
      throw new ProtocolError("No transport set for MCP adapter");
    }
    
    if (!this.toolsRegistered) {
      this.registerTools();
      this.toolsRegistered = true;
    }
    
    await this.mcp.connect(this.transport);
  }

  /**
   * 🚪 Disconnect this adapter
   */
  async disconnect(): Promise<void> {
    // Implementation would depend on MCP SDK's disconnect method
    // if supported, otherwise may need to rely on transport disconnect
    if (this.transport) {
      // For now, disconnect isn't explicitly in the SDK type definitions
      // So just remove reference to transport
      this.transport = null;
    }
  }

  /**
   * 🔗 Set the transport to use with this adapter
   */
  setTransport(transport: McpServerTransport): void {
    this.transport = transport;
  }

  /**
   * 🔍 Handle explore command
   */
  async explore(uri: string): Promise<ProtocolResponse> {
    try {
      const url = new URL(uri, "http://localhost"); // Base URL needed for parsing
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length === 2) {
        // Single Resource Request
        const type = pathParts[0];
        const id = pathParts[1];
        if (!type || !id) {
          return { status: 400, body: { error: "Invalid URI path for explore. Expected /type/id." } };
        }

        const resource = await this.store.get(type, id);

        if (resource) {
          return { status: 200, body: resource.toJSON() };
        } else {
          return { status: 404, body: { error: `Resource ${type}/${id} not found.` } };
        }
      } else if (pathParts.length === 1) {
        // Collection Request
        const type = pathParts[0];
        if (!type) {
          return { status: 400, body: { error: "Invalid URI path for explore. Expected /type or /type?params..." } };
        }

        // Parse query parameters into options
        const options: Record<string, any> = {};
        const filter: Record<string, unknown> = {};
        for (const [key, value] of url.searchParams.entries()) {
          if (key === "page") {
            const pageNum = parseInt(value, 10);
            if (!isNaN(pageNum) && pageNum > 0) options.page = pageNum;
          } else if (key === "pageSize") {
            const sizeNum = parseInt(value, 10);
            if (!isNaN(sizeNum) && sizeNum > 0) options.pageSize = sizeNum;
          } else {
            // Assume other params are filters
            filter[key] = value;
          }
        }
        if (Object.keys(filter).length > 0) {
          options.filter = filter;
        }

        const collection = await this.store.getCollection(type, options);
        return { status: 200, body: collection.toJSON() };

      } else {
        // Invalid URI path structure
        return { status: 400, body: { error: "Invalid URI path for explore. Expected /type/id or /type?params..." } };
      }

    } catch (error) {
      console.error("Error in explore:", error);
      return {
        status: 500,
        body: { error: error instanceof Error ? error.message : "An unknown error occurred during exploration." },
      };
    }
  }

  /**
   * ⚡ Handle act command
   */
  async act(uri: string, action: string, payload?: Record<string, unknown>): Promise<ProtocolResponse> {
    try {
      // Parse URI to get type and ID
      const uriParts = uri.split('/').filter(Boolean);
      if (uriParts.length !== 2 || !uriParts[0] || !uriParts[1]) {
        return { status: 400, body: { error: "Invalid URI for act. Expected /type/id." } };
      }
      const type = uriParts[0];
      const id = uriParts[1];

      if (!action) {
        return { status: 400, body: { error: "Action name is required for act." } };
      }

      // Call store.performAction()
      const resultResource = await this.store.performAction(type, id, action, payload);

      // Format successful response
      if (resultResource) {
        return {
          status: 200,
          body: resultResource.toJSON(),
        };
      } else {
        return {
          status: 204, // No Content
        };
      }

    } catch (error) {
      console.error("Error in act:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";

      if (errorMessage.includes("not found")) {
        return { status: 404, body: { error: errorMessage } };
      } else if (errorMessage.includes("not allowed in the current state")) {
        return { status: 403, body: { error: errorMessage } }; // Forbidden
      } else if (errorMessage.includes("Payload is required")) {
        return { status: 400, body: { error: errorMessage } }; // Bad Request
      }

      return { status: 500, body: { error: errorMessage } };
    }
  }

  /**
   * ➕ Handle create command
   */
  async create(uri: string, payload: Record<string, unknown>): Promise<ProtocolResponse> {
    try {
      // Parse URI to get type
      const uriParts = uri.split('/').filter(Boolean);
      if (uriParts.length !== 1 || !uriParts[0]) {
        return { status: 400, body: { error: "Invalid URI for create. Expected /type." } };
      }
      const type = uriParts[0];

      // Validate payload
      if (!payload || Object.keys(payload).length === 0) {
        return { status: 400, body: { error: "Payload is required for create." } };
      }

      // Call store.create()
      const createdResource = await this.store.create(type, payload);

      // Format successful response
      const resourceUri = `/${type}/${createdResource.getId()}`;
      return {
        status: 201,
        headers: { Location: resourceUri },
        body: createdResource.toJSON(),
      };

    } catch (error) {
      console.error("Error in create:", error);
      return {
        status: 500,
        body: { error: error instanceof Error ? error.message : "An unknown error occurred during creation." },
      };
    }
  }

  /**
   * ⚙️ Register the standard MCP tools
   */
  private registerTools(): void {
    this.registerExploreTool();
    this.registerActTool();
    this.registerCreateTool();
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
      }).describe("Navigate and explore resources and collections"),
      async (params: {
        concept: string;
        id?: string;
        filter?: Record<string, unknown>;
        pagination?: {
          page?: number;
          pageSize?: number;
        };
      }) => {
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
        parameters: z.record(z.any()).optional().describe("Action parameters"),
      }).describe("Perform actions on resources"),
      async (params: {
        concept: string;
        id: string;
        action: string;
        parameters?: Record<string, unknown>;
      }) => {
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
      async (params: {
        concept: string;
        data: Record<string, unknown>;
      }) => {
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
   * 🚨 Handle errors during MCP tool execution
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
 * Configuration options for the MCP adapter
 */
export interface McpAdapterOptions {
  name?: string;
  version?: string;
} 