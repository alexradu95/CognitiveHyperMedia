/**
 * 🧩 Represents a core resource within the Cognitive Hypermedia framework.
 * Based on Section 6.2 of the white paper.
 */
export class CognitiveResource {
  private _id: string;
  private _type: string;
  private _properties: Record<string, unknown>;
  // Placeholders for future features based on white paper sections 4 & 6.2
  private _actions: Record<string, Action>;
  private _state?: ResourceState;
  private _relationships: Record<string, Relationship>;
  private _presentation: PresentationHints;
  private _prompts: ConversationPrompt[];
  private _linksArray: Link[] = [];

  /**
   * ⚙️ Creates a new CognitiveResource instance.
   * @param config - Configuration for the resource.
   * @param config.id - The unique identifier for the resource.
   * @param config.type - The type of the resource.
   * @param config.properties - Initial domain-specific properties.
   */
  constructor(config: {
    id: string;
    type: string;
    properties?: Record<string, unknown>;
    actions?: Record<string, Action>;
    links?: Link[];
  }) {
    this._id = config.id;
    this._type = config.type;
    this._properties = config.properties || {};
    this._actions = config.actions || {};
    this._relationships = {}; // Initialize relationships
    this._presentation = {}; // Initialize presentation hints
    this._prompts = []; // Initialize prompts
    this._linksArray = config.links || [];
    this.addLink({ rel: "self", href: `/${this._type}/${this._id}` });
  }

  /**
   * ✨ Gets the unique identifier of the resource.
   * @returns The resource ID.
   */
  getId(): string {
    return this._id;
  }

  /**
   * ✨ Gets the type of the resource.
   * @returns The resource type.
   */
  getType(): string {
    return this._type;
  }

  /**
   * ✨ Gets the value of a specific property.
   * @param name - The name of the property to retrieve.
   * @returns The value of the property, or undefined if it doesn't exist.
   */
  getProperty(name: string): unknown {
    return this._properties[name];
  }

  /**
   * 🔍 Retrieves all properties of the resource.
   * @returns A Map containing all resource properties.
   */
  getProperties(): Map<string, unknown> {
    return new Map(Object.entries(this._properties)); // Convert object to [key, value] pairs for Map constructor
  }

  /**
   * ⚙️ Sets the value of a specific property.
   * @param name - The name of the property to set.
   * @param value - The value to set for the property.
   * @returns The current CognitiveResource instance for chaining.
   */
  setProperty(name: string, value: unknown): CognitiveResource {
    this._properties[name] = value;
    return this;
  }

  /**
   * ⚙️ Adds an action definition to the resource.
   * @param id - The identifier for the action.
   * @param action - The action definition object.
   * @returns The current CognitiveResource instance for chaining.
   */
  addAction(id: string, action: Action): CognitiveResource {
    this._actions[id] = action;
    return this;
  }

  /**
   * ✨ Gets a specific action definition by its identifier.
   * @param id - The identifier of the action to retrieve.
   * @returns The action definition, or undefined if it doesn't exist.
   */
  getAction(id: string): Action | undefined {
    return this._actions[id];
  }

  /**
   * ⚙️ Sets the state representation of the resource.
   * @param state - The state object.
   * @returns The current CognitiveResource instance for chaining.
   */
  setState(state: ResourceState): CognitiveResource {
    this._state = state;
    return this;
  }

  /**
   * ✨ Gets the current state identifier of the resource.
   * @returns The current state string, or undefined if no state is set.
   */
  getCurrentState(): string | undefined {
    return this._state?.current;
  }

  /**
   * ⚙️ Adds a relationship definition to the resource.
   * @param name - The name of the relationship (e.g., 'assignee', 'project').
   * @param relationship - The relationship definition object.
   * @returns The current CognitiveResource instance for chaining.
   */
  addRelationship(name: string, relationship: Relationship): CognitiveResource {
    this._relationships[name] = relationship;
    return this;
  }

  /**
   * ✨ Gets a specific relationship definition by its name.
   * @param name - The name of the relationship to retrieve.
   * @returns The relationship definition, or undefined if it doesn't exist.
   */
  getRelationship(name: string): Relationship | undefined {
    return this._relationships[name];
  }

  /**
   * ⚙️ Sets or updates presentation hints for the resource.
   * Existing hints are merged with the provided hints.
   * @param hints - The presentation hints object to set or merge.
   * @returns The current CognitiveResource instance for chaining.
   */
  setPresentation(hints: Partial<PresentationHints>): CognitiveResource {
    this._presentation = { ...this._presentation, ...hints };
    return this;
  }

  /**
   * ⚙️ Adds a conversation prompt to the resource.
   * @param prompt - The conversation prompt object.
   * @returns The current CognitiveResource instance for chaining.
   */
  addPrompt(prompt: ConversationPrompt): CognitiveResource {
    this._prompts.push(prompt);
    return this;
  }

  /**
   * ✨ Gets all conversation prompts associated with the resource.
   * @returns An array of conversation prompt objects.
   */
  getPrompts(): ConversationPrompt[] {
    // Return a copy to prevent external modification of the internal array
    return [...this._prompts];
  }

  /**
   * 🔗 Adds a link related to this resource.
   * Avoids adding duplicate links based on 'rel' and 'href'.
   * @param link - The Link object to add.
   */
  addLink(link: Link): void {
    // Avoid duplicates based on rel/href combo
    const exists = this._linksArray.some(l => l.rel === link.rel && l.href === link.href);
    if (!exists) {
      this._linksArray.push(link);
    }
  }

  /**
   * 🔗 Retrieves all links associated with this resource.
   * @returns An array of Link objects.
   */
  getLinks(): Link[] {
    return [...this._linksArray]; // Return a copy
  }

  /**
   * 🔗 Retrieves a specific link by its relation type (rel).
   * If multiple links share the same 'rel', returns the first one found.
   * @param rel - The relation type of the link to find.
   * @returns The Link object, or undefined if not found.
   */
  getLink(rel: string): Link | undefined {
    return this._linksArray.find(link => link.rel === rel);
  }

  /**
   * ✨ Serializes the resource to a plain JSON object according to the
   * Cognitive Hypermedia format (Section 4.1).
   * Currently only includes basic properties (_id, _type, standard props).
   * Extensions (_actions, _state, etc.) will be added in subsequent TDD cycles.
   * @returns A JSON representation of the resource.
   */
  toJSON(): Record<string, any> {
    const result: Record<string, any> = {
      id: this._id,
      type: this._type,
      properties: this._properties,
    };

    if (Object.keys(this._actions).length > 0) {
      result.actions = this._actions;
    }
    if (this._state) {
      result._state = this._state;
    }
    if (Object.keys(this._presentation).length > 0) {
      result.presentation = this._presentation;
    }
    if (this._prompts.length > 0) {
      result.prompts = this._prompts;
    }
    if (this._linksArray.length > 0) {
      result.links = this.getLinks();
    }

    return result;
  }

  /** 🗑️ Removes all actions associated with this resource. */
  clearActions(): void {
    this._actions = {};
  }
}

// --- Future Type Definitions (Placeholder) ---
// Based on Appendix B / Section 4 schemas

/**
 * 🧩 Defines an action that can be performed on a resource.
 * Based on Section 4.2 of the white paper.
 */
export interface Action {
  description: string;
  effect?: string;
  confirmation?: string;
  parameters?: Record<string, ParameterDefinition>;
}

/**
 * 🧩 Defines a parameter for an action.
 * Based on Section 4.2 of the white paper.
 */
export interface ParameterDefinition {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: unknown[]; // For enumerated values
  min?: number; // For numeric types
  max?: number; // For numeric types
  pattern?: string; // For string types (regex)
}

/**
 * 🧩 Represents the state of a resource.
 * Based on Section 4.3 of the white paper.
 */
export interface ResourceState {
  current: string; // Current state identifier
  description?: string; // Human-readable description of current state
  allowedTransitions?: string[]; // Array of allowed action identifiers
  disallowedTransitions?: DisallowedTransition[]; // Array of disallowed actions w/ reasons
  history?: StateHistoryEntry[]; // Optional array of previous states
}

/**
 * 🧩 Describes why a specific transition (action) is disallowed.
 * Part of the ResourceState.
 */
export interface DisallowedTransition {
  action: string;
  reason: string;
}

/**
 * 🧩 Represents an entry in the state history of a resource.
 * Part of the ResourceState.
 */
export interface StateHistoryEntry {
  state: string;
  enteredAt: string; // ISO 8601 timestamp
  exitedAt?: string; // ISO 8601 timestamp
  actor?: string; // Identifier of the entity that caused the state change
}

/**
 * 🧩 Defines a relationship between resources using a concept-oriented approach.
 * Based on Section 4.4 of the white paper.
 */
export interface Relationship {
  type: string; // Related resource type (e.g., "user", "task")
  id?: string; // Related resource ID (optional for cardinality many w/ only preview)
  preview?: Record<string, unknown>; // Preview data of the related resource
  cardinality?: "one" | "many"; // Relationship cardinality (defaults to 'one' if omitted)
  role?: string; // Describes the role of the related resource (e.g., "assignee", "parent")
}

/**
 * 🧩 Provides guidance on how the resource should be visualized and interacted with.
 * Based on Section 4.5 of the white paper.
 */
export interface PresentationHints {
  priority?: "high" | "medium" | "low"; // Importance for UI rendering
  visualization?: string; // Suggested visualization type (e.g., "card", "listItem")
  icon?: string; // Suggested icon name/identifier
  color?: string; // Suggested color (e.g., CSS color name or hex code)
  grouping?: string; // Suggested grouping category
  emphasisProperties?: string[]; // Array of property names to emphasize
  progressIndicator?: ProgressIndicator; // Progress visualization guidance
  actionPriorities?: ActionPriorities; // Hints on which actions to emphasize
}

/**
 * 🧩 Defines how to visualize progress related to a resource.
 * Part of PresentationHints.
 */
export interface ProgressIndicator {
  type: "percentage" | "fraction" | "steps";
  value: number;
  max?: number; // Required for fraction/steps type
  label?: string;
}

/**
 * 🧩 Defines priority levels for actions within a UI.
 * Part of PresentationHints.
 */
export interface ActionPriorities {
  primary?: string; // Identifier of the primary action
  secondary?: string[]; // Identifiers of secondary actions
}

/**
 * 🧩 Provides suggested conversation flows to help the LLM guide interaction.
 * Based on Section 4.6 of the white paper.
 */
export interface ConversationPrompt {
  type: "follow-up" | "confirmation" | "explanation" | "suggestion";
  text: string;
  condition?: string; // Optional condition expression (e.g., "when state.current == 'pending'")
  priority?: "high" | "medium" | "low";
}

/**
 * 🔗 Represents a hyperlink related to a resource (HATEOAS).
 */
export interface Link {
  /** Relation type (e.g., "self", "related", "collection", "schema", inferred type like "customer"). */
  rel: string;
  /** The URI/path pointing to the related resource or collection. */
  href: string;
  /** Optional human-readable title for the link. */
  title?: string;
  /** Optional hint about the expected media type of the target resource. */
  type?: string; // e.g., "application/json", "text/html"
}

/**
 * 🧩 Defines an action that can be performed on a resource.
 * Based on Section 4.2 of the white paper.
 */
export interface CognitiveResourceOptions {
  id: string;
  type: string;
  properties?: Record<string, unknown>;
  actions?: Record<string, Action>;
  links?: Link[]; // Add links to options
  // ... other potential options ...
} 