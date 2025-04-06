import { McpError } from "../../infrastracture/core/errors.ts";
import { IProtocolAdapter, CognitiveStore, NavigationAdapter, ProtocolError, ProtocolResponse } from "../../main.ts";
import { z } from "zod";
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
        if (!payload || !payload.relation) {
          return { status: 400, body: { error: "Relation is required for navigate action." } };
        }

        const result = await this.navigationAdapter.traverse(type, id, payload.relation as string);
        
        if (!result) {
          return { status: 404, body: { error: `No resources found with relation '${payload.relation}' from ${type}/${id}.` } };
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
        if (!payload || !payload.targetType || !payload.targetId || !payload.sourceRel || !payload.targetRel) {
          return { 
            status: 400, 
            body: { error: "targetType, targetId, sourceRel, and targetRel are required for link action." } 
          };
        }
        
        const result = await this.navigationAdapter.link(
          type, 
          id, 
          payload.targetType as string, 
          payload.targetId as string, 
          payload.sourceRel as string, 
          payload.targetRel as string
        );
        
        return { status: 200, body: result.toJSON() };
      } else if (action === "unlink") {
        // Handle removing links between resources
        if (!payload || !payload.targetType || !payload.targetId) {
          return { 
            status: 400, 
            body: { error: "targetType and targetId are required for unlink action." } 
          };
        }
        
        const result = await this.navigationAdapter.unlink(
          type, 
          id, 
          payload.targetType as string, 
          payload.targetId as string, 
          payload.relation as string
        );
        
        return { status: 200, body: result.toJSON() };
      } else if (action === "findReferencing") {
        // Find resources that reference this resource
        const relation = payload?.relation as string | undefined;
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
        const relations = payload?.relations as string[] | undefined;
        
        const graph = await this.navigationAdapter.createGraph(type, id, depth, relations);
        
        return { status: 200, body: graph };
      } else {
        // Call standard store.performAction() for other actions
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
      } else if (errorMessage.includes("not implemented")) {
        return { status: 501, body: { error: errorMessage } }; // Not Implemented
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
    this.registerNavigateTool();
  }

  /**
   * 🧭 Register the MCP navigate tool
   */
  private registerNavigateTool(): void {
    this.mcp.tool(
      "navigate",
      {
        uri: z.string().min(1, "URI is required"),
        relation: z.string().min(1, "Relation is required"),
        depth: z.number().optional(),
        format: z.enum(["resource", "graph"]).optional(),
      },
      async (args) => {
        try {
          // Parse URI to get type and ID
          const uriParts = args.uri.split('/').filter(Boolean);
          if (uriParts.length !== 2 || !uriParts[0] || !uriParts[1]) {
            return {
              content: [{
                type: "text",
                text: `Invalid URI for navigate. Expected /type/id.`
              }],
              isError: true
            };
          }
          
          const [type, id] = uriParts;
          
          // If the user wants a graph format, use createGraph instead of traverse
          if (args.format === "graph") {
            const graph = await this.navigationAdapter.createGraph(
              type, 
              id, 
              args.depth || 2, 
              [args.relation]
            );
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(graph, null, 2)
              }]
            };
          } else {
            // Default to resource traversal
            const result = await this.navigationAdapter.traverse(type, id, args.relation);
            
            if (!result) {
              return {
                content: [{
                  type: "text",
                  text: `No resources found with relation '${args.relation}'`
                }],
                isError: true
              };
            }
            
            let responseText: string;
            
            if (Array.isArray(result)) {
              responseText = JSON.stringify({ 
                type: "collection", 
                items: result.map(r => r.toJSON()),
                count: result.length
              }, null, 2);
            } else {
              responseText = JSON.stringify(result.toJSON(), null, 2);
            }
            
            return {
              content: [{
                type: "text",
                text: responseText
              }]
            };
          }
        } catch (error) {
          console.error(`Error in navigate tool:`, error);
          return {
            content: [{
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );
  }

  /**
   * 🔍 Register the MCP explore tool
   */
  private registerExploreTool(): void {
    this.mcp.tool(
      "explore",
      {
        uri: z.string().min(1, "URI is required"),
      },
      async (args) => {
        try {
          const response = await this.explore(args.uri);
          
          if (response.status >= 200 && response.status < 300) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response.body, null, 2)
              }]
            };
          } else {
            return {
              content: [{
                type: "text",
                text: `Explore failed: ${response.body?.error || 'Unknown error'}`
              }],
              isError: true
            };
          }
        } catch (error) {
          console.error(`Error in explore tool:`, error);
          return {
            content: [{
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );
  }

  /**
   * ⚡ Register the MCP act tool
   */
  private registerActTool(): void {
    this.mcp.tool(
      "act",
      {
        uri: z.string().min(1, "URI is required"),
        action: z.string().min(1, "Action name is required"),
        payload: z.record(z.unknown()).optional(),
      },
      async (args) => {
        try {
          const response = await this.act(args.uri, args.action, args.payload);
          
          if (response.status >= 200 && response.status < 300) {
            return {
              content: [{
                type: "text",
                text: response.body ? JSON.stringify(response.body, null, 2) : "Action completed successfully."
              }]
            };
          } else {
            return {
              content: [{
                type: "text",
                text: `Action failed: ${response.body?.error || 'Unknown error'}`
              }],
              isError: true
            };
          }
        } catch (error) {
          console.error(`Error in act tool:`, error);
          return {
            content: [{
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );
  }

  /**
   * ➕ Register the MCP create tool
   */
  private registerCreateTool(): void {
    this.mcp.tool(
      "create",
      {
        uri: z.string().min(1, "URI is required"),
        payload: z.record(z.unknown()).refine(val => Object.keys(val).length > 0, "Payload is required"),
      },
      async (args) => {
        try {
          const response = await this.create(args.uri, args.payload);
          
          if (response.status >= 200 && response.status < 300) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response.body, null, 2)
              }]
            };
          } else {
            return {
              content: [{
                type: "text",
                text: `Create failed: ${response.body?.error || 'Unknown error'}`
              }],
              isError: true
            };
          }
        } catch (error) {
          console.error(`Error in create tool:`, error);
          return {
            content: [{
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
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