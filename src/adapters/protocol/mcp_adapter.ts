import { McpError } from "../../infrastracture/core/errors.ts";
import { IProtocolAdapter, CognitiveStore, NavigationAdapter, ProtocolError, ProtocolResponse } from "../../main.ts";
import { z } from "npm:zod";
// Using npm: prefix for npm packages in Deno
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";

// Define a basic interface for MCP transports compatible with Transport from the SDK
interface McpServerTransport {
  // Properties from Transport interface
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
export class McpProtocolAdapter implements IProtocolAdapter {
  private store: CognitiveStore;
  private mcp: McpServer;
  private transport: McpServerTransport | null = null;
  private toolsRegistered = false;
  private navigationAdapter: NavigationAdapter;

  /**
   * Create a new MCP protocol adapter.
   * 
   * @param store - CognitiveStore instance to connect to
   * @param options - MCP-specific options
   */
  constructor(store: CognitiveStore, options: McpAdapterOptions = {}) {
    this.store = store;
    this.mcp = new McpServer({
      name: options.name || "Cognitive Hypermedia Server",
      version: options.version || "1.0.0"
    });
    this.navigationAdapter = new NavigationAdapter(store);
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
      } else if (action === "findReferencing") {
        // Find resources that reference this resource
        const relation = typeof payload?.relation === 'string' ? payload.relation : undefined;
        const result = await this.navigationAdapter.findReferencing(type, id, relation);
        
        return {
          status: 200,
          body: {
            type: "collection",
            items: result.map(r => r.toJSON()),
            count: result.length
          }
        };
      } else if (action === "createGraph") {
        // Create a graph of related resources
        const depth = payload?.depth ? Number(payload.depth) : 2;
        const relations = Array.isArray(payload?.relations) ? payload.relations as string[] : undefined;
        
        const graph = await this.navigationAdapter.createGraph(type, id, depth, relations);
        
        return { status: 200, body: graph };
      } else {
        // Call standard store.performAction() for other actions
        const resultResource = await this.store.performAction(type, id, action, payload);

        if (resultResource) {
          return { status: 200, body: resultResource.toJSON() };
        } else {
          // The resource was deleted or this is a void action
          return { status: 204, body: { message: "Action completed successfully (no content)" } };
        }
      }

    } catch (error) {
      console.error("Error in act:", error);
      return {
        status: error instanceof ProtocolError ? error.status || 500 : 500,
        body: { 
          error: error instanceof Error ? error.message : "An unknown error occurred during action execution."
        },
      };
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
   * 🔗 Register all MCP tools
   */
  private registerTools(): void {
    this.registerNavigateTool();
    this.registerExploreTool();
    this.registerActTool();
    this.registerCreateTool();
  }

  /**
   * 🧭 Register the navigate tool
   */
  private registerNavigateTool(): void {
    this.mcp.tool(
      "navigate",
      {
        uri: z.string().describe("URI of the resource to navigate from (e.g., /task/123)"),
        relation: z.string().describe("Relation to follow (e.g., 'child', 'parent', 'related')")
      },
      async (args: NavigateToolArgs) => {
        try {
          if (typeof args.uri !== 'string') {
            throw new McpError("URI must be a string", "invalid_parameter");
          }
          
          // Split URI into parts, safely
          const uriParts = args.uri.split('/').filter(Boolean);
          if (uriParts.length !== 2) {
            throw new McpError("Invalid URI format. Expected /type/id", "invalid_uri");
          }
          
          const [type, id] = uriParts;
          
          if (typeof args.relation !== 'string') {
            throw new McpError("Relation must be a string", "invalid_parameter");
          }
          
          const result = await this.navigationAdapter.traverse(type, id, args.relation);
          
          if (!result) {
            return `No resources found with relation '${args.relation}'.`;
          }
          
          if (Array.isArray(result)) {
            const resultStr = result.map(r => {
              const title = r.getProperty("title") || r.getProperty("name") || r.getId();
              return `- ${r.getType()}/${r.getId()}: ${title}`;
            }).join("\n");
            return `Found ${result.length} related resources:\n${resultStr}`;
          } else {
            const title = result.getProperty("title") || result.getProperty("name") || result.getId();
            return `Found related resource: ${result.getType()}/${result.getId()}: ${title}`;
          }
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            error instanceof Error ? error.message : "An unknown error occurred",
            "navigation_error"
          );
        }
      }
    );
  }

  /**
   * 🔍 Register the explore tool
   */
  private registerExploreTool(): void {
    this.mcp.tool(
      "explore",
      {
        uri: z.string().describe("URI to explore (e.g., /task/123 or /task?status=pending)")
      },
      async (args: ExploreToolArgs) => {
        try {
          if (typeof args.uri !== 'string') {
            throw new McpError("URI must be a string", "invalid_parameter");
          }
          
          const response = await this.explore(args.uri);
          
          if (response.status >= 400) {
            throw new McpError(
              response.body.error ? String(response.body.error) : "Error exploring resource",
              "exploration_error"
            );
          }
          
          return JSON.stringify(response.body, null, 2);
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            error instanceof Error ? error.message : "An unknown error occurred",
            "exploration_error"
          );
        }
      }
    );
  }

  /**
   * ⚡ Register the act tool
   */
  private registerActTool(): void {
    this.mcp.tool(
      "act",
      {
        uri: z.string().describe("URI of the resource to act on (e.g., /task/123)"),
        action: z.string().describe("Name of the action to perform (e.g., 'complete', 'delete')"),
        payload: z.record(z.unknown()).optional().describe("Optional parameters for the action")
      },
      async (args: ActToolArgs) => {
        try {
          if (typeof args.uri !== 'string') {
            throw new McpError("URI must be a string", "invalid_parameter");
          }
          
          if (typeof args.action !== 'string') {
            throw new McpError("Action must be a string", "invalid_parameter");
          }
          
          const response = await this.act(args.uri, args.action, args.payload);
          
          if (response.status >= 400) {
            throw new McpError(
              response.body.error ? String(response.body.error) : "Error performing action",
              "action_error"
            );
          }
          
          return JSON.stringify(response.body, null, 2);
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            error instanceof Error ? error.message : "An unknown error occurred",
            "action_error"
          );
        }
      }
    );
  }

  /**
   * ➕ Register the create tool
   */
  private registerCreateTool(): void {
    this.mcp.tool(
      "create",
      {
        uri: z.string().describe("URI path for the resource type (e.g., /task)"),
        payload: z.record(z.unknown()).describe("Properties for the new resource")
      },
      async (args: CreateToolArgs) => {
        try {
          if (typeof args.uri !== 'string') {
            throw new McpError("URI must be a string", "invalid_parameter");
          }
          
          if (!args.payload || typeof args.payload !== 'object') {
            throw new McpError("Payload must be an object", "invalid_parameter");
          }
          
          const response = await this.create(args.uri, args.payload);
          
          if (response.status >= 400) {
            throw new McpError(
              response.body.error ? String(response.body.error) : "Error creating resource",
              "creation_error"
            );
          }
          
          return JSON.stringify(response.body, null, 2);
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            error instanceof Error ? error.message : "An unknown error occurred",
            "creation_error"
          );
        }
      }
    );
  }
}

/**
 * Options for MCP adapter creation
 */
export interface McpAdapterOptions {
  name?: string;
  version?: string;
} 