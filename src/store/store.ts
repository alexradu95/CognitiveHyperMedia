import {
  CognitiveResource,
  Action,
  Link,
  ParameterDefinition,
  PresentationHints,
  ConversationPrompt,
  // ... other necessary imports from resource.ts ...
} from "../core/resource.ts";
import { CognitiveCollection, PaginationInfo } from "../core/collection.ts";
import { StateMachine, StateMachineDefinition } from "../core/statemachine.ts"; // Uncommented

/**
 * 💾 Provides persistence and retrieval logic for Cognitive Resources using Deno KV.
 * Also handles resource enhancement (adding actions, state, etc.).
 * Based on Section 6.3 of the white paper.
 */
export class CognitiveStore {
  private kv: Deno.Kv;
  private stateMachines: Map<string, StateMachine>; // Use the imported StateMachine type

  /**
   * ⚙️ Creates a new CognitiveStore instance.
   * @param kv - An initialized Deno KV instance for storage.
   */
  constructor(kv: Deno.Kv) {
    this.kv = kv;
    this.stateMachines = new Map(); // Initialize the map
  }

  /**
   * ⚙️ Registers a state machine definition for a specific resource type.
   * @param type The resource type (e.g., 'task', 'order').
   * @param definition The state machine definition for this type.
   */
  registerStateMachine(
    type: string,
    definition: StateMachineDefinition
  ): void {
    const stateMachine = new StateMachine(definition);
    // TODO: Add validation for the definition itself inside the StateMachine constructor?
    this.stateMachines.set(type, stateMachine);
    console.log(`Registered state machine for type: ${type}`); // Optional: for debugging
  }

  /**
   * ➕ Creates a new resource in the KV store.
   * @param type - The type of the resource to create.
   * @param data - The initial data for the resource properties.
   *               If data.id is provided, it will be used; otherwise, a UUID is generated.
   *               If a state machine is registered for the type, the initial state will be automatically set in the 'status' property.
   * @returns A promise resolving to the created and enhanced CognitiveResource.
   */
  async create(
    type: string,
    data: Record<string, unknown>
  ): Promise<CognitiveResource> {
    const id = (data.id as string) || crypto.randomUUID();
    const key = [type, id];

    // Initialize resource data, merging input data
    const resourceData: Record<string, unknown> = { ...data };

    // Add standard metadata
    resourceData.id = id; // Ensure ID is persisted
    resourceData.createdAt = new Date().toISOString();
    resourceData.updatedAt = new Date().toISOString(); // Set updatedAt on creation too

    // Set initial state if a state machine exists for this type
    if (this.stateMachines.has(type)) {
      const sm = this.stateMachines.get(type)!; // We know it exists due to .has() check
      resourceData.status = sm.getInitialState(); // Use 'status' property for state
    }

    // Store in KV
    const commitResult = await this.kv.set(key, resourceData);
    if (!commitResult.ok) {
      throw new Error(`Failed to commit resource ${type}/${id} to KV store.`);
    }

    // Create the resource instance
    // TODO: Handle different resource types (e.g., instantiate CognitiveCollection if type is collection?)
    const resource = new CognitiveResource({
      id: id,
      type,
      properties: resourceData,
    });

    // Enhance with standard actions, relationships, etc.
    this.enhanceResource(resource); // Apply enhancements

    return resource;
  }

  /**
   * 🔎 Retrieves a single resource by its type and ID.
   * @param type - The type of the resource.
   * @param id - The unique identifier of the resource.
   * @returns A promise resolving to the enhanced CognitiveResource, or null if not found.
   */
  async get(type: string, id: string): Promise<CognitiveResource | null> {
    const key = [type, id];
    const result = await this.kv.get<Record<string, unknown>>(key);

    if (!result.value) {
      return null; // Resource not found
    }

    // Create basic resource instance
    const resource = new CognitiveResource({
      id: id, // Use the requested ID
      type: type, // Use the requested type
      properties: result.value, // Use the data retrieved from KV
    });

    // Enhance with actions, state info, relationships, etc.
    this.enhanceResource(resource);

    return resource;
  }

  /**
   * 🔄 Updates an existing resource in the KV store.
   * Merges existing data with the provided updates and sets a new updatedAt timestamp.
   * @param type - The type of the resource.
   * @param id - The ID of the resource to update.
   * @param updates - An object containing the properties to update.
   * @returns A promise resolving to the updated and enhanced CognitiveResource.
   * @throws {Error} If the resource with the specified type/id is not found.
   */
  async update(
    type: string,
    id: string,
    updates: Record<string, unknown>
  ): Promise<CognitiveResource> {
    const key = [type, id];

    // 1. Get existing data
    const existingResult = await this.kv.get<Record<string, unknown>>(key);
    if (!existingResult.value) {
      throw new Error(`Resource ${type}/${id} not found for update.`);
    }

    // 2. Create merged data
    // Make sure not to overwrite the original 'id' or 'createdAt' from updates
    const { id: _, createdAt: __, ...safeUpdates } = updates;
    const updatedData = {
      ...existingResult.value,
      ...safeUpdates, // Apply safe updates over existing data
      id: id, // Ensure original ID is kept
      createdAt: existingResult.value.createdAt, // Ensure original createdAt is kept
      updatedAt: new Date().toISOString(), // Set new timestamp
    };

    // Prevent direct status updates if a state machine manages this type
    if (updates.hasOwnProperty('status') && this.stateMachines.has(type)) {
        throw new Error(`Direct status updates are not allowed for type '${type}'. Use performAction for state transitions.`);
    }

    // TODO (Future): Handle state transitions if updates include state changes & machine exists
    // if (updates.status && this.stateMachines.has(type)) { ... }

    // 3. Update in KV store
    const commitResult = await this.kv.set(key, updatedData);
    if (!commitResult.ok) {
      throw new Error(`Failed to commit update for resource ${type}/${id} to KV store.`);
    }

    // 4. Create and enhance the updated resource instance
    const resource = new CognitiveResource({
      id,
      type,
      properties: updatedData,
    });

    this.enhanceResource(resource);

    return resource;
  }

  /**
   * ❌ Deletes a resource from the KV store.
   * Fails gracefully if the resource doesn't exist.
   * @param type - The type of the resource to delete.
   * @param id - The ID of the resource to delete.
   * @returns A promise that resolves when the deletion attempt is complete.
   */
  async delete(type: string, id: string): Promise<void> {
    const key = [type, id];
    // Deno KV delete is idempotent, so no need to check existence first.
    await this.kv.delete(key);
  }

  // --- Placeholder Methods for Future Batches ---

  /**
   * 📚 Retrieves a collection of resources, supporting filtering and pagination.
   * @param type - The type of resources to retrieve.
   * @param options - Optional settings for filtering and pagination.
   * @returns A promise resolving to the populated and enhanced CognitiveCollection.
   */
  async getCollection(
    type: string,
    options: CollectionOptions = {}
  ): Promise<CognitiveCollection> {
    const { filter = {}, page = 1, pageSize = 10 } = options; // Default page size 10

    // Build prefix for listing
    const prefix = [type];

    // 1. List and filter resources from KV
    const entries = this.kv.list<Record<string, unknown>>({ prefix });
    const filteredItemsData: Array<[string, Record<string, unknown>]> = [];

    for await (const entry of entries) {
      const id = entry.key[entry.key.length - 1] as string;
      const data = entry.value;

      // Apply filters (simple equality check for now)
      if (this.matchesFilter(data, filter)) {
        filteredItemsData.push([id, data]);
      }
    }

    // 2. Sort filtered items (e.g., by creation date) for consistent pagination
    filteredItemsData.sort(([, aData], [, bData]) => {
      // Sort ascending by createdAt timestamp
      const dateA = aData.createdAt ? new Date(aData.createdAt as string).getTime() : 0;
      const dateB = bData.createdAt ? new Date(bData.createdAt as string).getTime() : 0;
      return dateA - dateB;
    });

    // 3. Apply pagination to the *sorted* list
    const totalItems = filteredItemsData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedItemsData = filteredItemsData.slice(startIndex, startIndex + pageSize);

    // 4. Create and enhance resource instances for the current page
    const items: CognitiveResource[] = [];
    for (const [id, data] of paginatedItemsData) {
      const resource = new CognitiveResource({
        id,
        type,
        properties: data,
      });
      this.enhanceResource(resource); // Ensure items are enhanced
      items.push(resource);
    }

    // 5. Create the collection instance
    const collection = new CognitiveCollection({
      id: `${type}-collection-${page}`, // Example dynamic ID
      itemType: type,
      items: items,
    });

    // 6. Set pagination info
    collection.setPagination({
      page,
      pageSize,
      totalItems,
      totalPages,
    });

    // 7. Set applied filters if any were used
    if (Object.keys(filter).length > 0) {
      collection.setFilters(filter);
    }

    // 8. Add default collection-level actions
    collection.addAction("create", {
      description: `Create a new ${type}`,
      // parameters: this.getCreateParameters(type) // TODO
    });
    collection.addAction("filter", {
      description: `Filter ${type} collection`,
      // parameters: this.getFilterParameters(type) // TODO
    });

    // TODO (Future): Add collection-level presentation hints

    // TODO (Future): Add collection-level prompts
    // collection.addPrompt({ ... });

    // TODO (Future): Add aggregates if applicable
    // const aggregates = await this.calculateAggregates(type, filteredItemsData);
    // if (Object.keys(aggregates).length > 0) { collection.setAggregates(aggregates); }

    return collection;
  }

  /**
   * 🛠️ Executes a defined action on a specific resource.
   *
   * @param type The type of the resource.
   * @param id The ID of the resource.
   * @param actionName The name of the action to perform.
   * @param payload Optional data required by the action.
   * @returns The updated resource if the action modifies it, null if the action deletes it, or throws on failure.
   * @throws {Error} If the resource or action is not found, or if the payload is invalid.
   */
  async performAction(
    type: string,
    id: string,
    actionName: string,
    payload?: Record<string, unknown>
  ): Promise<CognitiveResource | null> {
    const resource = await this.get(type, id);
    if (!resource) {
      throw new Error(`Resource ${type}/${id} not found for action '${actionName}'.`);
    }

    // Check if action exists *and* is allowed by the current state (if applicable)
    const sm = this.stateMachines.get(type);
    const currentState = resource.getProperty("status") as string | undefined;

    if (sm && currentState) {
      const allowed = sm.isActionAllowed(currentState, actionName);
      // State machine exists, check if action is allowed in the current state
      if (!allowed) {
        // Strict check: Action must be defined in the current state's allowedActions.
        throw new Error(`Action '${actionName}' is not allowed in the current state '${currentState}' for resource ${type}/${id}.`);
      }
    } else {
      // No state machine, just check if the action was added during enhancement (e.g., default update/delete)
      const action = resource.getAction(actionName);
      if (!action) {
        throw new Error(`Action '${actionName}' not found on resource ${type}/${id}.`);
      }
    }

    let resultResource: CognitiveResource | null = null;
    let updateRequired = false;
    let finalState = currentState; // Assume state doesn't change unless a transition occurs

    // Execute the action logic
    switch (actionName) {
      case "update":
        // Restore original check
        if (!payload || Object.keys(payload).length === 0) {
          throw new Error(`Payload is required and cannot be empty for 'update' action.`);
        }
        // Perform the update. Note: this already calls enhanceResource internally.
        resultResource = await this.update(type, id, payload);
        updateRequired = true; // Mark that the resource was modified
        break;
      case "delete":
        await this.delete(type, id);
        resultResource = null; // Indicate successful deletion
        updateRequired = false; // No resource left to update state on
        break;
      default:
        // Handle custom actions defined by the state machine (or other mechanisms later)
        // For now, custom actions don't modify properties other than triggering a state transition.
        // We need the original resource to check transitions *from*, but might need to re-enhance
        // or return the updated one if the state changes.
        // If the action was allowed (checked before switch), we assume it succeeds conceptually.
        resultResource = resource; // Start with the resource as it was before the action
        updateRequired = true;     // Assume a potential state update is needed
        break;
    }

    // Check for state transition *after* action logic executes
    if (sm && currentState) {
      const targetState = sm.getTargetState(currentState, actionName);
      if (targetState && targetState !== currentState) {
        finalState = targetState;
        // If the resource still exists and state changed, update the status property
        if (updateRequired && resultResource) {
          // Update the status specifically. Use internal update to avoid infinite loop.
          // We need to be careful here. Calling this.update() triggers enhance again.
          // A lower-level KV update might be better, or ensure update doesn't re-enhance?
          // For now, let's risk the re-enhance, assuming it's idempotent for status.

          // Directly update the status in KV to avoid calling update() again
          const currentData = (await this.kv.get<Record<string, unknown>>([type, id])).value;
          if (currentData) {
            const newData = {
              ...currentData,
              status: finalState,
              updatedAt: new Date().toISOString(), // Also update timestamp on state change
            };
            const commitResult = await this.kv.set([type, id], newData);
            if (!commitResult.ok) {
                console.error(`KV commit failed when updating status for ${type}/${id}`);
                // Decide how to handle commit failure - throw? log?
                // For now, log and continue, the in-memory resource status *is* updated.
            }
            console.log(`Transitioned ${type}/${id} from ${currentState} to ${finalState}`);
            // Update the in-memory resource object as well
            resultResource.setProperty("status", finalState);
            resultResource.setProperty("updatedAt", newData.updatedAt);
            // Re-enhance needed ONLY if hints/prompts/links depend on the *new* status
            // Since enhanceResource reads status, let's re-enhance for consistency
            this.enhanceResource(resultResource); // Re-enhance with the new state
          } else {
              console.warn(`Could not find resource ${type}/${id} in KV for status update after action.`);
              // This shouldn't happen if updateRequired=true and resultResource exists
          }
        }
      }
    }

    return resultResource;
  }

  // async update(type: string, id: string, data: Record<string, unknown>): Promise<CognitiveResource> { /* ... */ }
  // async delete(type: string, id: string): Promise<void> { /* ... */ }
  // async performAction(type: string, id: string, action: string, parameters?: Record<string, unknown>): Promise<CognitiveResource> { /* ... */ }

  // --- Private Helper Methods ---

  /**
   * ✨ Enhances a newly created or retrieved resource with standard cognitive hypermedia features.
   * Currently adds default 'update' and 'delete' actions.
   * Will be expanded in future batches to add state, relationships, presentation, prompts.
   * @param resource - The CognitiveResource instance to enhance.
   */
  private enhanceResource(resource: CognitiveResource): void {
    const type = resource.getType();

    // Clear existing actions before re-evaluating based on current state/defaults
    resource.clearActions();

    const sm = this.stateMachines.get(type);
    const currentState = resource.getProperty("status") as string | undefined;

    const actionsToAdd: Record<string, Action> = {};

    // 1. Add state-specific information and actions if applicable
    if (sm && currentState) {
      const stateDef = sm.getStateDefinition(currentState);
      if (stateDef) {
        // Add state info as properties
        resource.setProperty("_stateName", currentState);
        if (stateDef.description) {
          resource.setProperty("_stateDescription", stateDef.description);
        }

        // Get actions allowed by the current state
        const stateActions = sm.getAllowedActions(currentState);
        for (const [actionName, actionDef] of Object.entries(stateActions)) {
          actionsToAdd[actionName] = actionDef;
        }
      }
    }

    // 2. Add default actions if not already defined by the state
    if (!actionsToAdd["update"]) {
      actionsToAdd["update"] = {
        description: `Update this ${type}`,
        // parameters: this.getUpdateParameters(type) // TODO
      };
    }
    if (!actionsToAdd["delete"]) {
      actionsToAdd["delete"] = {
        description: `Delete this ${type}`,
        confirmation: `Are you sure you want to delete this ${type}?`,
      };
    }

    // 3. Apply all determined actions to the resource
    for (const [actionName, actionDef] of Object.entries(actionsToAdd)) {
      resource.addAction(actionName, actionDef);
    }

    // 4. Add relationship links based on property naming conventions
    for (const [propName, propValue] of resource.getProperties().entries()) {
      // Simple convention: property ends with 'Id' and has a non-empty string value
      if (typeof propName === 'string' && propName.endsWith('Id') && propName !== 'id' && typeof propValue === 'string' && propValue) {
        const relatedId = propValue;
        // Infer related type by removing 'Id' suffix
        const relatedType = propName.slice(0, -2);
        if (relatedType) {
          resource.addLink({
            rel: relatedType, // Use inferred type as relation type
            href: `/${relatedType}/${relatedId}`, // Construct a simple path
            title: `Related ${relatedType}` // Add a basic title
          });
        }
      }
    }

    // 5. Add Presentation Hints
    const presentationHints: Partial<PresentationHints> = {};
    if (currentState) {
      presentationHints.emphasisProperties = ["status"]; // Highlight the status property
      // Add state-specific hints (example for task)
      if (type === "task") {
        switch (currentState) {
          case "pending":
            presentationHints.icon = "⌛"; // Hourglass
            presentationHints.color = "orange";
            break;
          case "inProgress":
            presentationHints.icon = "⚙️"; // Gear
            presentationHints.color = "blue";
            break;
          case "completed":
            presentationHints.icon = "✅"; // Check mark
            presentationHints.color = "green";
            break;
          case "cancelled":
          case "blocked":
            presentationHints.icon = "❌"; // Cross mark
            presentationHints.color = "red";
            break;
        }
      }
    }
    // Apply the hints
    if (Object.keys(presentationHints).length > 0) {
      resource.setPresentation(presentationHints);
    }

    // 6. Add Conversation Prompts
    // Clear existing default prompts if any, before adding new ones
    // resource.clearPrompts(); // Assuming a clearPrompts method exists or add one if needed

    // Generic prompt
    resource.addPrompt({
      type: "suggestion",
      text: "What actions can I perform on this?",
    });

    // State-specific prompts (example for task)
    if (type === "task" && sm && currentState) {
      switch (currentState) {
        case "pending":
          resource.addPrompt({
            type: "follow-up",
            text: `How do I start the '${resource.getProperty("title") || type}' task?`,
            condition: `action_exists("start")`, // Hypothetical condition
          });
          resource.addPrompt({
            type: "explanation",
            text: `Why is this task pending?`,
          });
          break;
        case "inProgress":
          resource.addPrompt({
            type: "follow-up",
            text: `What's the next step to complete the '${resource.getProperty("title") || type}' task?`,
            condition: `action_exists("complete")`,
          });
          break;
        case "blocked":
          resource.addPrompt({
            type: "follow-up",
            text: `How can I unblock the '${resource.getProperty("title") || type}' task?`,
            condition: `action_exists("unblock")`,
          });
          break;
        case "completed":
           resource.addPrompt({
            type: "suggestion",
            text: `Should I archive the completed '${resource.getProperty("title") || type}' task?`,
            condition: `action_exists("archive")`,
          });
          break;
      }
    }

    // TODO (Future): Add prompts based on relationships
  }

  // // Helper to get parameters for 'update' action (future batch)
  // private getUpdateParameters(type: string): Record<string, ParameterDefinition> {
  //   // This would likely involve looking up a schema definition for the type
  //   return {};
  // }

  // // Helper to get parameters for collection 'create' action (future batch)
  // private getCreateParameters(type: string): Record<string, ParameterDefinition> {
  //   return {};
  // }

  // // Helper to get parameters for collection 'filter' action (future batch)
  // private getFilterParameters(type: string): Record<string, ParameterDefinition> {
  //   return {};
  // }

  // // Helper to add relationships based on property naming conventions or schema (future batch)
  // private addRelationships(resource: CognitiveResource): void { /* ... */ }

  // // Helper to add presentation hints (future batch)
  // private addPresentationHints(resource: CognitiveResource): void { /* ... */ }

  // // Helper to add conversation prompts (future batch)
  // private addConversationPrompts(resource: CognitiveResource): void { /* ... */ }

  // Simple filter matcher (can be expanded later)
  private matchesFilter(
    data: Record<string, unknown>,
    filter: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Options for retrieving a collection.
 */
export interface CollectionOptions {
  filter?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  // sort?: { by: string; direction: "asc" | "desc" }; // Future enhancement
} 