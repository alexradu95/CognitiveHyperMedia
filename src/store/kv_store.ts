import {
    CognitiveCollection,
    CognitiveResource,
    PaginationInfo,
  } from "../core/types.ts";
  import { ResourceNotFoundError } from "../core/errors.ts";
  
  export interface CollectionOptions {
    filter?: Record<string, unknown>;
    page?: number;
    pageSize?: number;
    // Add other options like sort, include, etc. as needed
  }
  
  /**
   * ⚙️ Provides persistence layer using Deno KV.
   */
  export class CognitiveStore {
    private kv: Deno.Kv;
  
    constructor(kv: Deno.Kv) {
      this.kv = kv;
      // Initialize state machines or other dependencies if needed
    }
  
    /**
     * ✨ Creates a new resource in the store.
     * @param type The type of resource to create.
     * @param data The initial data for the resource.
     * @returns The newly created CognitiveResource.
     */
    async create(
      type: string,
      data: Record<string, unknown>,
    ): Promise<CognitiveResource> {
      const id = (data._id as string) || crypto.randomUUID();
      const key = [type, id];
  
      const resourceData = {
        ...data,
        _id: id,
        _type: type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  
      // Basic validation or transformation before saving
      // ...
  
      await this.kv.set(key, resourceData);
  
      // Enhance resource after creation (add actions, state etc.)
      return this.enhanceResource(
        resourceData as unknown as CognitiveResource,
      );
    }
  
    /**
     * 📚 Retrieves a resource by its type and ID.
     * @param type The type of the resource.
     * @param id The ID of the resource.
     * @returns The retrieved CognitiveResource or null if not found.
     */
    async get(
      type: string,
      id: string,
    ): Promise<CognitiveResource | null> {
      const key = [type, id];
      const result = await this.kv.get<Record<string, unknown>>(key);
  
      if (!result.value) {
        return null;
      }
  
      return this.enhanceResource(
        result.value as unknown as CognitiveResource,
      );
    }
  
    /**
     * 📚 Retrieves a collection of resources.
     * @param type The type of resources in the collection.
     * @param options Options for filtering, pagination, etc.
     * @returns A CognitiveCollection.
     */
    async getCollection(
      type: string,
      options: CollectionOptions = {},
    ): Promise<CognitiveCollection> {
      const { filter = {}, page = 1, pageSize = 10 } = options;
      const prefix = [type];
      const entries = this.kv.list<Record<string, unknown>>({ prefix });
  
      const filteredItems: CognitiveResource[] = [];
      for await (const entry of entries) {
        const resource = entry.value as unknown as CognitiveResource;
        if (this.matchesFilter(resource, filter)) {
          filteredItems.push(resource);
        }
      }
  
      const totalItems = filteredItems.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedItemsData = filteredItems.slice(
        startIndex,
        startIndex + pageSize,
      );
  
      // Enhance items before adding to collection
      const enhancedItems = await Promise.all(
        paginatedItemsData.map((item) => this.enhanceResource(item)),
      );
  
      const collection: CognitiveCollection = {
        _id: `${type}-collection-${crypto.randomUUID()}`, // Or a more stable ID
        _type: "collection",
        itemType: type,
        items: enhancedItems,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        },
        filters: Object.keys(filter).length > 0 ? filter : undefined,
        // Add aggregates if needed
      };
  
      // Enhance collection itself (add collection-level actions, etc.)
      return this.enhanceCollection(collection);
    }
  
    /**
     * 🔄 Updates an existing resource.
     * @param type The type of the resource.
     * @param id The ID of the resource.
     * @param data The data to update.
     * @returns The updated CognitiveResource.
     * @throws {ResourceNotFoundError} If the resource doesn't exist.
     */
    async update(
      type: string,
      id: string,
      data: Partial<CognitiveResource>,
    ): Promise<CognitiveResource> {
      const key = [type, id];
      const existing = await this.kv.get<Record<string, unknown>>(key);
  
      if (!existing.value) {
        throw new ResourceNotFoundError(type, id);
      }
  
      const updatedData = {
        ...existing.value,
        ...data,
        _id: id, // Ensure ID doesn't change
        _type: type, // Ensure type doesn't change
        updatedAt: new Date().toISOString(),
      };
  
      // Add validation or state transition logic here
      // ...
  
      await this.kv.set(key, updatedData);
  
      return this.enhanceResource(
        updatedData as unknown as CognitiveResource,
      );
    }
  
    /**
     * ❌ Deletes a resource.
     * @param type The type of the resource.
     * @param id The ID of the resource.
     * @throws {ResourceNotFoundError} If the resource doesn't exist.
     */
    async delete(type: string, id: string): Promise<void> {
      const key = [type, id];
      // Optional: Check if it exists before deleting
      const existing = await this.kv.get(key);
      if (!existing.value) {
        // Decide whether to throw or silently succeed
        throw new ResourceNotFoundError(type, id);
      }
      await this.kv.delete(key);
    }
  
    /**
     * 🚀 Performs an action on a resource.
     * @param type Resource type.
     * @param id Resource ID.
     * @param action Action ID.
     * @param parameters Action parameters.
     * @returns The potentially modified CognitiveResource after the action.
     * @throws {ResourceNotFoundError} If the resource doesn't exist.
     * @throws {InvalidActionError} If the action is not available/valid.
     */
    async performAction(
      type: string,
      id: string,
      action: string,
      parameters: Record<string, unknown> = {},
    ): Promise<CognitiveResource> {
      const resource = await this.get(type, id);
      if (!resource) {
        throw new ResourceNotFoundError(type, id);
      }
  
      // TODO: Action handling logic based on resource._actions
      // This will involve checking if the action exists in resource._actions,
      // validating parameters, and potentially updating the resource state.
      console.log(
        `Performing action ${action} on ${type}/${id} with params:`,
        parameters,
      );
  
      // Example: Handle a standard 'delete' action if defined generically
      if (action === "delete") {
        await this.delete(type, id);
        // Return a representation indicating deletion, or the state before deletion
        return { ...resource, _state: { current: "deleted" } };
      }
  
      // Placeholder: For now, just return the resource without modification
      // In a real implementation, update the resource based on the action's effect
      // e.g., return await this.update(type, id, { status: 'completed', ... });
      return resource;
    }
  
    // --- Private Helper Methods ---
  
    /**
     * ✨ Enhances a raw resource object with Cognitive Hypermedia properties.
     * This is where actions, state, relationships, presentation, prompts are added.
     * @param resource The raw resource data.
     * @returns The enhanced CognitiveResource.
     */
    private async enhanceResource(
      resource: CognitiveResource,
    ): Promise<CognitiveResource> {
      // TODO: Implement logic to add _actions, _state, _relationships, etc.
      // This might involve looking up definitions based on resource._type,
      // checking state machines, querying related data.
  
      // Example: Add standard actions (implementation depends on design)
      resource._actions = {
        ...(resource._actions || {}),
        update: {
          description: `Update this ${resource._type}`,
          // Define parameters based on resource type schema
        },
        delete: {
          description: `Delete this ${resource._type}`,
          confirmation: `Are you sure you want to delete this ${resource._type}?`,
        },
      };
  
      // Example: Basic state (if not already set)
      if (!resource._state) {
        resource._state = { current: "default" };
      }
  
      // Example: Load relationships based on foreign keys (e.g., resource.assigneeId)
      // resource._relationships = await this.resolveRelationships(resource);
  
      // Example: Add default presentation hints
      // resource._presentation = this.getDefaultPresentation(resource._type);
  
      // Example: Add default prompts
      // resource._prompts = this.getDefaultPrompts(resource);
  
      return resource;
    }
  
    /**
     * ✨ Enhances a raw collection object with Cognitive Hypermedia properties.
     * @param collection The raw collection data.
     * @returns The enhanced CognitiveCollection.
     */
    private enhanceCollection(
      collection: CognitiveCollection,
    ): CognitiveCollection {
      // Add collection-level actions, presentation, prompts
      collection._actions = {
        ...(collection._actions || {}),
        create: {
          description: `Create a new ${collection.itemType}`,
          // Define parameters based on itemType schema
        },
        filter: {
          description: `Filter this ${collection.itemType} collection`,
          // Define filter parameters
        },
        // Add sort, etc.
      };
  
      collection._presentation = {
        ...(collection._presentation || {}),
        visualization: "list", // Default visualization
      };
  
      collection._prompts = [
        ...(collection._prompts || []),
        {
          type: "suggestion",
          text: `You can filter these ${collection.itemType}s.`,
        },
        {
          type: "follow-up",
          text: `Would you like to create a new ${collection.itemType}?`,
        },
      ];
  
      return collection;
    }
  
    /**
     * ✅ Checks if a resource matches the given filter criteria.
     * @param resource The resource to check.
     * @param filter The filter criteria.
     * @returns True if the resource matches, false otherwise.
     */
    private matchesFilter(
      resource: Record<string, unknown>,
      filter: Record<string, unknown>,
    ): boolean {
      for (const [key, value] of Object.entries(filter)) {
        // Basic equality check, needs enhancement for ranges, etc.
        if (resource[key] !== value) {
          return false;
        }
      }
      return true;
    }
  
    // Add more helper methods as needed (e.g., for relationship resolution)
  }