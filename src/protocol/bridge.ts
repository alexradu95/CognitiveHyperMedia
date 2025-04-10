import { CognitiveStore } from "../store/store.ts";
import { CognitiveResource } from "../core/resource.ts";
import { CognitiveError, isError } from "../core/types.ts";

/**
 * ✨ Protocol-agnostic bridge for connecting store with any protocol adapter
 * 
 * This simplified bridge provides a clean interface for protocol adapters
 * without unnecessary complexity.
 */
export class CognitiveBridge {
  private store: CognitiveStore;

  /**
   * Create a new bridge
   * 
   * @param store - The CognitiveStore to connect
   */
  constructor(store: CognitiveStore) {
    this.store = store;
  }

  /**
   * 🔍 Resolve a URI to a resource
   * 
   * @param uri - URI path to resolve (e.g., "/tasks/123")
   * @returns The resolved resource or error
   */
  async resolveUri(uri: string): Promise<CognitiveResource | CognitiveError> {
    try {
      // Skip leading slash if present
      const normalizedUri = uri.startsWith("/") ? uri.substring(1) : uri;
      
      // Special case for root URI
      if (normalizedUri === "" || normalizedUri === "/") {
        return await this.getRootResource();
      }
      
      // Parse URI segments for type and ID
      const segments = normalizedUri.split("/");
      
      if (segments.length === 1) {
        // Collection request (e.g., "/tasks")
        return await this.store.getCollection(segments[0]);
      } else if (segments.length === 2) {
        // Individual resource request (e.g., "/tasks/123")
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
   * 🔧 Perform an action on a resource
   * 
   * @param uri - URI of the resource (e.g., "/tasks/123")
   * @param action - Name of the action to perform
   * @param parameters - Parameters for the action
   * @returns Result of the action
   */
  async performAction(
    uri: string, 
    action: string, 
    parameters: Record<string, unknown> = {}
  ): Promise<CognitiveResource | CognitiveError> {
    try {
      // Skip leading slash if present
      const normalizedUri = uri.startsWith("/") ? uri.substring(1) : uri;
      
      // Parse URI segments
      const segments = normalizedUri.split("/");
      
      if (segments.length !== 2) {
        return this.createInvalidUriError(uri);
      }
      
      const [type, id] = segments;
      
      // Perform the action
      const result = await this.store.performAction(type, id, action, parameters);
      if (!result) {
        return this.createNotFoundError(type, id);
      }
      return result;
    } catch (error) {
      return this.createErrorFromException(error);
    }
  }

  /**
   * ➕ Create a new resource
   * 
   * @param type - Type of resource to create
   * @param data - Resource data
   * @returns The created resource
   */
  async createResource(
    type: string,
    data: Record<string, unknown>
  ): Promise<CognitiveResource | CognitiveError> {
    try {
      return await this.store.create(type, data);
    } catch (error) {
      return this.createErrorFromException(error);
    }
  }

  // Private helper methods

  /**
   * Get the root resource (entry point)
   */
  private async getRootResource(): Promise<CognitiveResource> {
    // Create a root resource with links to collections
    const types = await this.store.getResourceTypes();
    
    const root = new CognitiveResource({
      id: "root",
      type: "system",
      properties: {
        name: "Cognitive Hypermedia API Root",
        description: "Entry point for the Cognitive Hypermedia API",
      }
    });
    
    // Add links to each resource type collection
    for (const type of types) {
      root.addLink({
        rel: "collection",
        href: `/${type}`,
        title: `${type} collection`,
      });
    }
    
    return root;
  }

  /**
   * Create an error for resource not found
   */
  private createNotFoundError(type: string, id: string): CognitiveError {
    return {
      _type: "error",
      code: "resource_not_found",
      message: `Resource ${type}/${id} not found`,
      details: { resourceType: type, resourceId: id }
    };
  }

  /**
   * Create an error for invalid URI
   */
  private createInvalidUriError(uri: string): CognitiveError {
    return {
      _type: "error",
      code: "invalid_uri",
      message: `Invalid URI: ${uri}`,
      details: { uri }
    };
  }

  /**
   * Create an error from an exception
   */
  private createErrorFromException(error: unknown): CognitiveError {
    if (isError(error)) {
      return error as CognitiveError;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    
    return {
      _type: "error",
      code: "internal_error",
      message: `An error occurred: ${message}`
    };
  }
}

/**
 * ✨ Creates a bridge connected to a store
 * 
 * @param store - The CognitiveStore to connect
 * @returns A new bridge instance
 */
export function createBridge(store: CognitiveStore): CognitiveBridge {
  return new CognitiveBridge(store);
}

export type Bridge = CognitiveBridge; 