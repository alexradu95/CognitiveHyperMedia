// Mock interfaces for testing purposes
interface McpServer {
  tool(name: string, schema: any, handler: (params: any) => Promise<any>): void;
  connect(transport: McpServerTransport): Promise<void>;
}

interface McpServerTransport {
  clientMeta: { name: string; version: string };
  serverMeta: { name: string; version: string };
  onRequest(requestType: string, callback: (request: any) => Promise<any>): void;
  sendRequest(request: any): Promise<any>;
  connect(): Promise<void>;
}

// Create a basic implementation for testing
class BasicMcpServer implements McpServer {
  private tools: Record<string, { schema: any; handler: (params: any) => Promise<any> }> = {};

  tool(name: string, schema: any, handler: (params: any) => Promise<any>): void {
    this.tools[name] = { schema, handler };
  }

  async connect(transport: McpServerTransport): Promise<void> {
    return Promise.resolve();
  }
}

import { z } from "zod";
import { CognitiveStore } from "../../infrastracture/store/store.ts";
import { IProtocolAdapter, ProtocolResponse, ProtocolError } from "./protocol_adapter.ts";
import { ResourceNotFoundError, McpError } from "../../infrastracture/core/errors.ts";
import { CognitiveError } from "../../infrastracture/core/types.ts";

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
    this.mcp = new BasicMcpServer();
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

  /**
   * 🔍 Register the MCP explore tool
   */
  private registerExploreTool(): void {
    const exploreSchema = z.object({
      uri: z.string().min(1, "URI is required"),
    });

    this.mcp.tool("explore", exploreSchema, async (params: { uri: string }) => {
      try {
        const response = await this.explore(params.uri);
        
        if (response.status >= 200 && response.status < 300) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body, null, 2)
              }
            ]
          };
        } else {
          return this.handleMcpError(
            new McpError(`Explore failed: ${response.body?.error || 'Unknown error'}`, `${response.status}`),
            "explore",
          );
        }
      } catch (error) {
        return this.handleMcpError(error, "explore");
      }
    });
  }

  /**
   * ⚡ Register the MCP act tool
   */
  private registerActTool(): void {
    const actSchema = z.object({
      uri: z.string().min(1, "URI is required"),
      action: z.string().min(1, "Action name is required"),
      payload: z.record(z.unknown()).optional(),
    });

    this.mcp.tool("act", actSchema, async (params: { uri: string; action: string; payload?: Record<string, unknown> }) => {
      try {
        const response = await this.act(params.uri, params.action, params.payload);
        
        if (response.status >= 200 && response.status < 300) {
          return {
            content: [
              {
                type: "text",
                text: response.body ? JSON.stringify(response.body, null, 2) : "Action completed successfully."
              }
            ]
          };
        } else {
          return this.handleMcpError(
            new McpError(`Action failed: ${response.body?.error || 'Unknown error'}`, `${response.status}`),
            "act",
          );
        }
      } catch (error) {
        return this.handleMcpError(error, "act");
      }
    });
  }

  /**
   * ➕ Register the MCP create tool
   */
  private registerCreateTool(): void {
    const createSchema = z.object({
      uri: z.string().min(1, "URI is required"),
      payload: z.record(z.unknown()).refine(val => Object.keys(val).length > 0, "Payload is required"),
    });

    this.mcp.tool("create", createSchema, async (params: { uri: string; payload: Record<string, unknown> }) => {
      try {
        const response = await this.create(params.uri, params.payload);
        
        if (response.status >= 200 && response.status < 300) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.body, null, 2)
              }
            ]
          };
        } else {
          return this.handleMcpError(
            new McpError(`Create failed: ${response.body?.error || 'Unknown error'}`, `${response.status}`),
            "create",
          );
        }
      } catch (error) {
        return this.handleMcpError(error, "create");
      }
    });
  }

  /**
   * 🚨 Handle errors in a way compatible with MCP tool responses
   */
  private handleMcpError(
    error: unknown,
    toolName: string,
  ): { content: Array<{ type: string; text: string }>; isError: boolean } {
    console.error(`Error in ${toolName} tool:`, error);
    
    let errorMessage = "An unknown error occurred";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if ("status" in error && typeof (error as any).status === "number") {
        statusCode = (error as any).status;
      }
    }
    
    // Create an appropriate error message based on status code
    let userMessage = `Error (${statusCode}): ${errorMessage}`;
    
    if (statusCode === 404) {
      userMessage = `Resource not found: ${errorMessage}`;
    } else if (statusCode === 400) {
      userMessage = `Invalid request: ${errorMessage}`;
    } else if (statusCode === 403) {
      userMessage = `Operation not allowed: ${errorMessage}`;
    }
    
    return {
      content: [
        {
          type: "text",
          text: userMessage
        }
      ],
      isError: true
    };
  }
}

/**
 * Options for MCP adapter creation
 */
export interface McpAdapterOptions {
  name?: string;
  version?: string;
} 