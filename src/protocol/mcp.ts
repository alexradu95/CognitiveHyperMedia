import { CognitiveStore } from "../store/store.ts";
import { CognitiveResource } from "../core/resource.ts";
import { CognitiveError, isError } from "../core/types.ts";

/**
 * 🌉 Simple MCP service that connects directly to a CognitiveStore
 */
export class McpService {
  private store: CognitiveStore;
  private transport: any = null;

  /**
   * Create a new MCP service
   * 
   * @param store - CognitiveStore to use for operations
   */
  constructor(store: CognitiveStore) {
    this.store = store;
  }

  /**
   * 🔄 Connect to the transport
   */
  async connect(transport: any): Promise<void> {
    this.transport = transport;
    
    // Set up message handlers for the transport
    transport.onmessage = async (message: any) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error("Error handling message:", error);
        this.sendErrorResponse(message.id, error instanceof Error ? error.message : String(error));
      }
    };
    
    await transport.start();
  }

  /**
   * 🚪 Disconnect from the transport
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  /**
   * 📨 Handle incoming messages
   */
  private async handleMessage(message: any): Promise<void> {
    if (!message || !message.id || !message.method) {
      console.error("Received invalid message format:", message);
      if (message && message.id) {
         this.sendErrorResponse(message.id, "Invalid message format: missing id or method");
      }
      return;
    }

    // Handle different method calls
    switch (message.method) {
      case "explore":
        await this.handleExplore(message);
        break;
      case "act":
        await this.handleAct(message);
        break;
      case "navigate":
        await this.handleNavigate(message);
        break;
      case "create":
        await this.handleCreate(message);
        break;
      default:
        this.sendErrorResponse(message.id, `Unknown method: ${message.method}`);
    }
  }

  /**
   * 🔍 Handle explore requests (incorporates resolveUri logic)
   */
  private async handleExplore(message: any): Promise<void> {
    const { uri } = message.params || {};
    if (!uri) {
      return this.sendErrorResponse(message.id, "Missing uri parameter for explore");
    }

    try {
      const result = await this.resolveUri(uri); 
      
      if (isError(result)) {
        return this.sendErrorResponse(message.id, result.message);
      }
      
      this.sendSuccessResponse(message.id, result.toJSON());
    } catch (error) {
      this.sendErrorResponse(message.id, this.createErrorFromException(error).message);
    }
  }

  /**
   * ⚡ Handle act requests (incorporates performAction logic)
   */
  private async handleAct(message: any): Promise<void> {
    const { uri, action, payload } = message.params || {};
    if (!uri || !action) {
      return this.sendErrorResponse(message.id, "Missing uri or action parameter for act");
    }

    try {
      const normalizedUri = uri.startsWith("/") ? uri.substring(1) : uri;
      const segments = normalizedUri.split("/");
      if (segments.length !== 2) {
        return this.sendErrorResponse(message.id, this.createInvalidUriError(uri).message);
      }
      const [type, id] = segments;

      const result = await this.store.performAction(type, id, action, payload || {});

      if (result === null) { 
         this.sendSuccessResponse(message.id, null); 
         return;
      }
      
      if (isError(result)) { 
        return this.sendErrorResponse(message.id, result.message);
      }
      
      this.sendSuccessResponse(message.id, result.toJSON());
    } catch (error) {
      this.sendErrorResponse(message.id, this.createErrorFromException(error).message);
    }
  }

  /**
   * 🔗 Handle navigate requests (incorporates navigateRelation logic)
   */
  private async handleNavigate(message: any): Promise<void> {
    const { uri, relation } = message.params || {};
    if (!uri || !relation) {
      return this.sendErrorResponse(message.id, "Missing uri or relation parameter for navigate");
    }

    try {
      const normalizedUri = uri.startsWith("/") ? uri.substring(1) : uri;
      const segments = normalizedUri.split("/");
      if (segments.length !== 2) {
         return this.sendErrorResponse(message.id, this.createInvalidUriError(uri).message);
      }
      const [type, id] = segments;

      const resource = await this.store.get(type, id);
      if (!resource) {
        return this.sendErrorResponse(message.id, this.createNotFoundError(type, id).message);
      }
      
      const links = resource.getLinks().filter(link => link.rel === relation);
      if (links.length === 0) {
        return this.sendErrorResponse(message.id, `No relation '${relation}' found on resource ${type}/${id}`);
      }
      const link = links[0];
      if (!link.href) {
         return this.sendErrorResponse(message.id, `Invalid link for relation '${relation}' on resource ${type}/${id}`);
      }

      const targetResource = await this.resolveUri(link.href);

      if (isError(targetResource)) {
         return this.sendErrorResponse(message.id, targetResource.message);
      }

      this.sendSuccessResponse(message.id, targetResource.toJSON());
    } catch (error) {
      this.sendErrorResponse(message.id, this.createErrorFromException(error).message);
    }
  }

  /**
   * ➕ Handle create requests (calls store directly)
   */
  private async handleCreate(message: any): Promise<void> {
    const { type, payload } = message.params || {};
    if (!type || !payload) {
      return this.sendErrorResponse(message.id, "Missing type or payload parameter for create");
    }
    
    try {
      const result = await this.store.create(type, payload);
      
      if (isError(result)) {
        return this.sendErrorResponse(message.id, result.message);
      }

      this.sendSuccessResponse(message.id, result.toJSON());
    } catch (error) {
      this.sendErrorResponse(message.id, this.createErrorFromException(error).message);
    }
  }

  /**
   * Resolve a URI to a resource or collection
   */
   private async resolveUri(uri: string): Promise<CognitiveResource | CognitiveError> {
     try {
       const normalizedUri = uri.startsWith("/") ? uri.substring(1) : uri;
       
       if (normalizedUri === "" || normalizedUri === "/") {
         return await this.getRootResource();
       }
       
       let baseUri = normalizedUri;
       let filter: Record<string, unknown> | undefined;
       if (normalizedUri.includes("?")) {
         const [path, queryString] = normalizedUri.split("?");
         baseUri = path;
         const params = new URLSearchParams(queryString);
         filter = {};
         for (const [key, value] of params.entries()) {
           filter[key] = value;
         }
       }

       const segments = baseUri.split("/");
       
       if (segments.length === 1) {
         const type = segments[0];
         return await this.store.getCollection(type, filter ? { filter } : {});
       } else if (segments.length === 2) {
         const [type, id] = segments;
         const resource = await this.store.get(type, id);
         if (!resource) {
           return this.createNotFoundError(type, id);
         }
         return resource;
       }
       
       return this.createInvalidUriError(uri);
     } catch (error) {
       return this.createErrorFromException(error);
     }
   }

  /**
   * Get the root resource (entry point)
   */
  private async getRootResource(): Promise<CognitiveResource> {
    const types = await this.store.getResourceTypes();
    const root = new CognitiveResource({
      id: "root",
      type: "system",
      properties: {
        name: "Cognitive Hypermedia API Root",
        description: "Entry point for the Cognitive Hypermedia API",
      }
    });
    for (const type of types) {
      root.addLink({
        rel: "collection",
        href: `/${type}`,
        title: `${type} collection`,
      });
    }
    return root;
  }

  private createNotFoundError(type: string, id: string): CognitiveError {
    return { _type: "error", code: "resource_not_found", message: `Resource ${type}/${id} not found`, details: { resourceType: type, resourceId: id } };
  }

  private createInvalidUriError(uri: string): CognitiveError {
    return { _type: "error", code: "invalid_uri", message: `Invalid URI: ${uri}`, details: { uri } };
  }
  
  private createErrorFromException(error: unknown): CognitiveError {
    if (isError(error)) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    return { _type: "error", code: "internal_error", message: message }; 
  }

  /**
   * ✅ Send a success response
   */
  private sendSuccessResponse(id: string, result: any): void {
    if (!this.transport) return;
    
    this.transport.send({ id, result });
  }

  /**
   * ❌ Send an error response
   */
  private sendErrorResponse(id: string, error: any): void {
    if (!this.transport) return;
    
    const errorMessage = typeof error === 'object' && error !== null && '_type' in error && error._type === 'error' 
        ? (error as CognitiveError).message 
        : (error instanceof Error ? error.message : String(error));
    
    this.transport.send({
      id,
      error: { message: errorMessage } 
    });
  }
}

/**
 * ✨ Creates a new MCP service connected directly to a store
 */
export function createMcpService(store: CognitiveStore): McpService {
  return new McpService(store);
} 