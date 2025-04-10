import { CognitiveStore } from "../store/store.ts";

/**
 * ✨ Direct interface to cognitive store with protocol capabilities
 * 
 * Simplified bridge that directly connects to the store without adapter abstraction
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
   * 🔍 Explore a resource by URI
   * 
   * @param uri - The resource URI to explore
   * @returns Promise with the resource or collection data
   */
  async explore(uri: string): Promise<any> {
    try {
      const url = new URL(uri, "http://localhost");
      const pathParts = url.pathname.split('/').filter(Boolean);

      if (pathParts.length === 2) {
        // Single Resource Request
        const type = pathParts[0];
        const id = pathParts[1];
        const resource = await this.store.get(type, id);
        return resource ? resource.toJSON() : null;
      } else if (pathParts.length === 1) {
        // Collection Request
        const type = pathParts[0];
        const options = this.parseQueryParams(url.searchParams);
        const collection = await this.store.getCollection(type, options);
        return collection.toJSON();
      }
      
      return null;
    } catch (error) {
      console.error("Error in explore:", error);
      throw error;
    }
  }

  /**
   * ⚡ Perform an action on a resource
   * 
   * @param uri - The resource URI to act upon
   * @param action - The action to perform
   * @param payload - Optional data for the action
   * @returns Promise with the action result
   */
  async act(uri: string, action: string, payload?: Record<string, unknown>): Promise<any> {
    try {
      const uriParts = uri.split('/').filter(Boolean);
      if (uriParts.length !== 2) return null;
      
      const type = uriParts[0];
      const id = uriParts[1];
      
      const resource = await this.store.get(type, id);
      if (!resource) return null;
      
      if (action === "update" && payload) {
        return this.store.update(type, id, payload);
      } else if (action === "delete") {
        return this.store.delete(type, id);
      } else if (action === "navigate" && payload?.relation) {
        return this.navigate(type, id, payload.relation as string);
      }
      
      return null;
    } catch (error) {
      console.error("Error in act:", error);
      throw error;
    }
  }
  
  /**
   * ➕ Create a new resource
   * 
   * @param uri - The resource type URI
   * @param payload - Data for the new resource
   * @returns Promise with the new resource
   */
  async create(uri: string, payload: Record<string, unknown>): Promise<any> {
    try {
      const type = uri.split('/').filter(Boolean)[0];
      if (!type) return null;
      
      const result = await this.store.create(type, payload);
      return result ? result.toJSON() : null;
    } catch (error) {
      console.error("Error in create:", error);
      throw error;
    }
  }
  
  /**
   * 🧭 Navigate from a resource following a relation
   * 
   * @param type - Resource type
   * @param id - Resource ID
   * @param relation - Relation to follow
   * @returns Promise with the target resource(s)
   */
  private async navigate(type: string, id: string, relation: string): Promise<any> {
    const resource = await this.store.get(type, id);
    if (!resource) return null;
    
    const links = resource.getLinks().filter(link => link.rel === relation);
    if (links.length === 0) return null;
    
    const results = [];
    for (const link of links) {
      const href = link.href;
      const targetParts = href.split('/').filter(Boolean);
      if (targetParts.length === 2) {
        const targetResource = await this.store.get(targetParts[0], targetParts[1]);
        if (targetResource) results.push(targetResource.toJSON());
      }
    }
    
    return results.length === 1 ? results[0] : results;
  }
  
  /**
   * Parse query parameters for collection operations
   */
  private parseQueryParams(params: URLSearchParams): Record<string, any> {
    const options: Record<string, any> = {};
    const filter: Record<string, unknown> = {};
    
    for (const [key, value] of params.entries()) {
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
    
    return options;
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