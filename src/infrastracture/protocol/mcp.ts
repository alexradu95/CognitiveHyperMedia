import { McpError } from "../core/errors.ts";
import { CognitiveStore } from "../../main.ts";
import { z } from "npm:zod";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { IProtocolAdapter, ProtocolError, ProtocolResponse } from "./protocol_adapter.ts";
import { NavigationAdapter } from "./navigation_adapter.ts";

// Define a basic interface for MCP transports compatible with Transport from the SDK
interface McpServerTransport {
  start(): Promise<void>;
  send(message: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: Record<string, unknown>) => void;
}

// Define types for tool handler arguments
interface NavigateToolArgs {
  uri: string;
  relation: string;
}

interface ExploreToolArgs {
  uri: string;
}

interface ActToolArgs {
  uri: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface CreateToolArgs {
  uri: string;
  payload: Record<string, unknown>;
}

/**
 * 🌉 MCP-specific implementation of the protocol adapter.
 * Handles communication using the Model Context Protocol.
 */
export class McpProtocol implements IProtocolAdapter {
  private store: CognitiveStore;
  private mcp: McpServer;
  private transport: McpServerTransport | null = null;
  private toolsRegistered = false;
  private navigationAdapter: NavigationAdapter;

  /**
   * Create a new MCP protocol implementation.
   * 
   * @param store - CognitiveStore instance to connect to
   * @param options - MCP-specific options
   */
  constructor(store: CognitiveStore, options: McpOptions = {}) {
    this.store = store;
    this.mcp = new McpServer({
      name: options.name || "Cognitive Hypermedia Server",
      version: options.version || "1.0.0"
    });
    this.navigationAdapter = new NavigationAdapter(store);
  }

  /**
   * 🔄 Connect this protocol to its transport layer
   */
  async connect(): Promise<void> {
    if (!this.transport) {
      throw new ProtocolError("No transport set for MCP protocol");
    }
    
    if (!this.toolsRegistered) {
      this.registerTools();
      this.toolsRegistered = true;
    }
    
    await this.mcp.connect(this.transport);
  }

  /**
   * 🚪 Disconnect this protocol
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      this.transport = null;
    }
  }

  /**
   * 🔗 Set the transport to use with this protocol
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

      // Handle navigation-specific actions
      if (action === "navigate") {
        if (!payload || typeof payload.relation !== 'string') {
          return { status: 400, body: { error: "Relation is required for navigate action." } };
        }

        const relation = payload.relation as string;
        const result = await this.navigationAdapter.traverse(type, id, relation);
        
        if (!result) {
          return { status: 404, body: { error: `No resources found with relation '${relation}' from ${type}/${id}.` } };
        }
        
        if (Array.isArray(result)) {
          // Return a collection if multiple resources
          return {
            status: 200,
            body: {
              type: "collection",
              items: result.map(r => r.toJSON()),
              count: result.length
            }
          };
        } else {
          // Return the single resource
          return { status: 200, body: result.toJSON() };
        }
      } else if (action === "link") {
        // Handle creating links between resources
        if (!payload || 
            typeof payload.targetType !== 'string' ||
            typeof payload.targetId !== 'string' ||
            typeof payload.sourceRel !== 'string' ||
            typeof payload.targetRel !== 'string') {
          return { 
            status: 400, 
            body: { error: "targetType, targetId, sourceRel, and targetRel are required for link action." } 
          };
        }
        
        const result = await this.navigationAdapter.link(
          type, 
          id, 
          payload.targetType, 
          payload.targetId, 
          payload.sourceRel, 
          payload.targetRel
        );
        
        return { status: 200, body: result.toJSON() };
      } else if (action === "unlink") {
        // Handle removing links between resources
        if (!payload || 
            typeof payload.targetType !== 'string' ||
            typeof payload.targetId !== 'string') {
          return { 
            status: 400, 
            body: { error: "targetType and targetId are required for unlink action." } 
          };
        }
        
        const sourceRel = typeof payload.relation === 'string' ? payload.relation : undefined;
        
        const result = await this.navigationAdapter.unlink(
          type, 
          id, 
          payload.targetType, 
          payload.targetId,
          sourceRel
        );
        
        return { status: 200, body: result.toJSON() };
      }

      // For other actions, delegate to the store
      const result = await this.store.performAction(type, id, action, payload);
      if (!result) {
        return { 
          status: 404, 
          body: { error: `Resource ${type}/${id} not found or action ${action} failed.` } 
        };
      }
      return { status: 200, body: result.toJSON() };

    } catch (error) {
      console.error("Error in act:", error);
      return {
        status: 500,
        body: { error: error instanceof Error ? error.message : "An unknown error occurred during action." },
      };
    }
  }

  /**
   * ➕ Handle create command
   */
  async create(uri: string, payload: Record<string, unknown>): Promise<ProtocolResponse> {
    try {
      const type = uri.split('/').filter(Boolean)[0];
      if (!type) {
        return { status: 400, body: { error: "Invalid URI for create. Expected /type." } };
      }

      const result = await this.store.create(type, payload);
      
      return { 
        status: 201, 
        headers: { Location: `/${type}/${result.getId()}` },
        body: result.toJSON() 
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
   * 🔧 Register all MCP tools
   */
  private registerTools(): void {
    this.registerNavigateTool();
    this.registerExploreTool();
    this.registerActTool();
    this.registerCreateTool();
  }

  /**
   * 🔧 Register the navigate tool
   */
  private registerNavigateTool(): void {
    const schema = z.object({
      uri: z.string(),
      relation: z.string()
    });

    this.mcp.tool("navigate", {
      description: "Navigate from a resource to related resources",
      parameters: schema,
      handler: async (params: NavigateToolArgs) => {
        const uriParts = params.uri.split('/').filter(Boolean);
        if (uriParts.length !== 2) {
          throw new McpError("Invalid URI format. Expected /type/id");
        }

        const [type, id] = uriParts;
        const result = await this.navigationAdapter.traverse(type, id, params.relation);
        
        if (!result) {
          throw new McpError(`No resources found with relation '${params.relation}'`);
        }

        if (Array.isArray(result)) {
          return {
            type: "collection",
            items: result.map(r => r.toJSON()),
            count: result.length
          };
        }

        return result.toJSON();
      }
    });
  }

  /**
   * 🔧 Register the explore tool
   */
  private registerExploreTool(): void {
    const schema = z.object({
      uri: z.string()
    });

    this.mcp.tool("explore", {
      description: "Explore a resource or collection of resources",
      parameters: schema,
      handler: async (params: ExploreToolArgs) => {
        const response = await this.explore(params.uri);
        if (response.status >= 400) {
          throw new McpError(response.body.error || "Exploration failed");
        }
        return response.body;
      }
    });
  }

  /**
   * 🔧 Register the act tool
   */
  private registerActTool(): void {
    const schema = z.object({
      uri: z.string(),
      action: z.string(),
      payload: z.record(z.unknown()).optional()
    });

    this.mcp.tool("act", {
      description: "Perform an action on a resource",
      parameters: schema,
      handler: async (params: ActToolArgs) => {
        const response = await this.act(params.uri, params.action, params.payload);
        if (response.status >= 400) {
          throw new McpError(response.body.error || "Action failed");
        }
        return response.body;
      }
    });
  }

  /**
   * 🔧 Register the create tool
   */
  private registerCreateTool(): void {
    const schema = z.object({
      uri: z.string(),
      payload: z.record(z.unknown())
    });

    this.mcp.tool("create", {
      description: "Create a new resource",
      parameters: schema,
      handler: async (params: CreateToolArgs) => {
        const response = await this.create(params.uri, params.payload);
        if (response.status >= 400) {
          throw new McpError(response.body.error || "Creation failed");
        }
        return response.body;
      }
    });
  }
}

/**
 * Options for MCP protocol implementation
 */
export interface McpOptions {
  name?: string;
  version?: string;
} 