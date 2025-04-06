import { 
  ResourceTypeLiteral, 
  PriorityLevel, 
  ParameterType, 
  PromptType,
  Cardinality,
  ProgressIndicatorType
} from "./types.ts";

/**
 * 🧩 Represents a core resource within the Cognitive Hypermedia framework.
 * Based on Section 6.2 of the white paper.
 */
export class CognitiveResource {
  #id: string;
  #type: string;
  #properties: Record<string, unknown>;
  #actions: Record<string, Action>;
  #state?: ResourceState;
  #relationships: Record<string, Relationship>;
  #presentation: PresentationHints;
  #prompts: ConversationPrompt[];
  #links: Link[] = [];

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
    this.#id = config.id;
    this.#type = config.type;
    this.#properties = config.properties ?? {};
    this.#actions = config.actions ?? {};
    this.#relationships = {}; 
    this.#presentation = {}; 
    this.#prompts = []; 
    this.#links = config.links ? [...config.links] : [];
    this.addLink({ rel: "self", href: `/${this.#type}/${this.#id}` });
  }

  /**
   * ✨ Gets the unique identifier of the resource.
   * @returns The resource ID.
   */
  getId(): string {
    return this.#id;
  }

  /**
   * ✨ Gets the type of the resource.
   * @returns The resource type.
   */
  getType(): string {
    return this.#type;
  }

  /**
   * ✨ Gets the value of a specific property.
   * @param name - The name of the property to retrieve.
   * @returns The value of the property, or undefined if it doesn't exist.
   */
  getProperty(name: string): unknown {
    return this.#properties[name];
  }

  /**
   * 🔍 Retrieves all properties of the resource.
   * @returns A Map containing all resource properties.
   */
  getProperties(): Map<string, unknown> {
    return new Map(Object.entries(this.#properties));
  }

  /**
   * ⚙️ Sets the value of a specific property.
   * @param name - The name of the property to set.
   * @param value - The value to set for the property.
   * @returns The current CognitiveResource instance for chaining.
   */
  setProperty(name: string, value: unknown): CognitiveResource {
    this.#properties[name] = value;
    return this;
  }

  /**
   * ⚙️ Adds an action definition to the resource.
   * @param id - The identifier for the action.
   * @param action - The action definition object.
   * @returns The current CognitiveResource instance for chaining.
   */
  addAction(id: string, action: Action): CognitiveResource {
    this.#actions[id] = action;
    return this;
  }

  /**
   * ✨ Gets a specific action definition by its identifier.
   * @param id - The identifier of the action to retrieve.
   * @returns The action definition, or undefined if it doesn't exist.
   */
  getAction(id: string): Action | undefined {
    return this.#actions[id];
  }

  /**
   * ✨ Gets all actions associated with this resource
   * @returns Record of action definitions
   */
  getActions(): Record<string, Action> {
    return { ...this.#actions };
  }

  /**
   * ⚙️ Sets the state representation of the resource.
   * @param state - The state object.
   * @returns The current CognitiveResource instance for chaining.
   */
  setState(state: ResourceState): CognitiveResource {
    this.#state = state;
    return this;
  }

  /**
   * ✨ Gets the current state identifier of the resource.
   * @returns The current state string, or undefined if no state is set.
   */
  getCurrentState(): string | undefined {
    return this.#state?.current;
  }

  /**
   * ✨ Gets the full state representation of the resource
   * @returns The state object, or undefined if not set
   */
  getState(): ResourceState | undefined {
    return this.#state ? { ...this.#state } : undefined;
  }

  /**
   * ⚙️ Adds a relationship definition to the resource.
   * @param name - The name of the relationship (e.g., 'assignee', 'project').
   * @param relationship - The relationship definition object.
   * @returns The current CognitiveResource instance for chaining.
   */
  addRelationship(name: string, relationship: Relationship): CognitiveResource {
    this.#relationships[name] = relationship;
    return this;
  }

  /**
   * ✨ Gets a specific relationship definition by its name.
   * @param name - The name of the relationship to retrieve.
   * @returns The relationship definition, or undefined if it doesn't exist.
   */
  getRelationship(name: string): Relationship | undefined {
    return this.#relationships[name];
  }

  /**
   * ✨ Gets all relationships associated with this resource
   * @returns Record of relationship definitions
   */
  getRelationships(): Record<string, Relationship> {
    return { ...this.#relationships };
  }

  /**
   * ⚙️ Sets or updates presentation hints for the resource.
   * Existing hints are merged with the provided hints.
   * @param hints - The presentation hints object to set or merge.
   * @returns The current CognitiveResource instance for chaining.
   */
  setPresentation(hints: Partial<PresentationHints>): CognitiveResource {
    this.#presentation = { ...this.#presentation, ...hints };
    return this;
  }

  /**
   * ✨ Gets the presentation hints for this resource
   * @returns The presentation hints object
   */
  getPresentation(): PresentationHints {
    return { ...this.#presentation };
  }

  /**
   * ⚙️ Adds a conversation prompt to the resource.
   * @param prompt - The conversation prompt object.
   * @returns The current CognitiveResource instance for chaining.
   */
  addPrompt(prompt: ConversationPrompt): CognitiveResource {
    this.#prompts.push(prompt);
    return this;
  }

  /**
   * ✨ Gets all conversation prompts associated with the resource.
   * @returns An array of conversation prompt objects.
   */
  getPrompts(): ConversationPrompt[] {
    return [...this.#prompts];
  }

  /**
   * 🔗 Adds a link related to this resource.
   * Avoids adding duplicate links based on 'rel' and 'href'.
   * @param link - The Link object to add.
   * @returns The current CognitiveResource instance for chaining.
   */
  addLink(link: Link): CognitiveResource {
    // Avoid duplicates based on rel/href combo
    const exists = this.#links.some(l => l.rel === link.rel && l.href === link.href);
    if (!exists) {
      this.#links.push(link);
    }
    return this;
  }

  /**
   * 🔗 Retrieves all links associated with this resource.
   * @returns An array of Link objects.
   */
  getLinks(): Link[] {
    return [...this.#links];
  }

  /**
   * 🔗 Retrieves a specific link by its relation type (rel).
   * If multiple links share the same 'rel', returns the first one found.
   * @param rel - The relation type of the link to find.
   * @returns The Link object, or undefined if not found.
   */
  getLink(rel: string): Link | undefined {
    return this.#links.find(link => link.rel === rel);
  }

  /**
   * ✨ Serializes the resource to a plain JSON object according to the
   * Cognitive Hypermedia format (Section 4.1).
   * @returns A JSON representation of the resource.
   */
  toJSON(): Record<string, any> {
    const result: Record<string, any> = {
      id: this.#id,
      type: this.#type,
      properties: this.#properties,
    };

    // Only include non-empty collections
    if (Object.keys(this.#actions).length > 0) {
      result.actions = this.#actions;
    }
    
    if (this.#state) {
      result._state = this.#state;
    }
    
    if (Object.keys(this.#relationships).length > 0) {
      result._relationships = this.#relationships;
    }
    
    if (Object.keys(this.#presentation).length > 0) {
      result.presentation = this.#presentation;
    }
    
    if (this.#prompts.length > 0) {
      result.prompts = this.#prompts;
    }
    
    if (this.#links.length > 0) {
      result.links = this.getLinks();
    }

    return result;
  }

  /** 
   * 🗑️ Removes all actions associated with this resource. 
   * @returns The current CognitiveResource instance for chaining.
   */
  clearActions(): CognitiveResource {
    this.#actions = {};
    return this;
  }
}

/**
 * 🏗️ Builder for creating CognitiveResource instances
 */
export class ResourceBuilder {
  #id: string;
  #type: string;
  #properties: Record<string, unknown> = {};
  #actions: Record<string, Action> = {};
  #links: Link[] = [];
  #state?: ResourceState;
  #relationships: Record<string, Relationship> = {};
  #presentation: PresentationHints = {};
  #prompts: ConversationPrompt[] = [];

  /**
   * Create a new ResourceBuilder
   * @param id - Resource identifier
   * @param type - Resource type
   */
  constructor(id: string, type: string) {
    this.#id = id;
    this.#type = type;
  }

  /**
   * Add a property to the resource
   */
  property(name: string, value: unknown): ResourceBuilder {
    this.#properties[name] = value;
    return this;
  }

  /**
   * Add multiple properties to the resource
   */
  properties(props: Record<string, unknown>): ResourceBuilder {
    this.#properties = { ...this.#properties, ...props };
    return this;
  }

  /**
   * Add an action to the resource
   */
  action(id: string, action: Action): ResourceBuilder {
    this.#actions[id] = action;
    return this;
  }

  /**
   * Set the state of the resource
   */
  state(state: ResourceState): ResourceBuilder {
    this.#state = state;
    return this;
  }

  /**
   * Add a relationship to the resource
   */
  relationship(name: string, relationship: Relationship): ResourceBuilder {
    this.#relationships[name] = relationship;
    return this;
  }

  /**
   * Set presentation hints for the resource
   */
  presentation(hints: Partial<PresentationHints>): ResourceBuilder {
    this.#presentation = { ...this.#presentation, ...hints };
    return this;
  }

  /**
   * Add a conversation prompt to the resource
   */
  prompt(prompt: ConversationPrompt): ResourceBuilder {
    this.#prompts.push(prompt);
    return this;
  }

  /**
   * Add a link to the resource
   */
  link(link: Link): ResourceBuilder {
    this.#links.push(link);
    return this;
  }

  /**
   * Build the CognitiveResource instance
   */
  build(): CognitiveResource {
    const resource = new CognitiveResource({
      id: this.#id,
      type: this.#type,
      properties: this.#properties,
      actions: this.#actions,
      links: this.#links
    });

    if (this.#state) {
      resource.setState(this.#state);
    }

    // Add relationships
    Object.entries(this.#relationships).forEach(([name, rel]) => {
      resource.addRelationship(name, rel);
    });

    // Set presentation
    if (Object.keys(this.#presentation).length > 0) {
      resource.setPresentation(this.#presentation);
    }

    // Add prompts
    this.#prompts.forEach(prompt => {
      resource.addPrompt(prompt);
    });

    return resource;
  }

  /**
   * Create a ResourceBuilder for the given id and type
   */
  static for(id: string, type: string): ResourceBuilder {
    return new ResourceBuilder(id, type);
  }
}

// --- Type Definitions ---

/**
 * 🛠️ Definition of an action available on a resource.
 */
export interface Action {
  description: string;
  effect?: string;
  confirmation?: string;
  parameters?: Record<string, ParameterDefinition>;
}

/**
 * 🛠️ Definition of a parameter for an action.
 */
export interface ParameterDefinition {
  type: ParameterType;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: unknown[]; // For enumerated values
  min?: number; // For numeric types
  max?: number; // For numeric types
  pattern?: string; // For string types (regex)
}

/**
 * 📚 Representation of the state of a resource.
 */
export interface ResourceState {
  current: string; // Current state identifier
  description?: string; // Human-readable description of current state
  allowedTransitions?: string[]; // Array of allowed action identifiers
  disallowedTransitions?: DisallowedTransition[]; // Array of disallowed actions w/ reasons
  history?: StateHistoryEntry[]; // Optional array of previous states
}

/**
 * 📚 Information about a disallowed state transition.
 */
export interface DisallowedTransition {
  action: string;
  reason: string;
}

/**
 * 📚 Entry in the state history of a resource.
 */
export interface StateHistoryEntry {
  state: string;
  enteredAt: string; // ISO 8601 timestamp
  exitedAt?: string; // ISO 8601 timestamp
  actor?: string; // Identifier of the entity that caused the state change
}

/**
 * 🧩 Definition of a relationship between resources.
 */
export interface Relationship {
  type: string; // Related resource type (e.g., "user", "task")
  id?: string; // Related resource ID (optional for cardinality many w/ only preview)
  preview?: Record<string, unknown>; // Preview data of the related resource
  cardinality?: Cardinality; // Relationship cardinality (defaults to 'one' if omitted)
  role?: string; // Describes the role of the related resource (e.g., "assignee", "parent")
}

/**
 * 🎨 Guidance on how a resource should be visualized.
 */
export interface PresentationHints {
  priority?: PriorityLevel; // Importance for UI rendering
  visualization?: string; // Suggested visualization type (e.g., "card", "listItem")
  icon?: string; // Suggested icon name/identifier
  color?: string; // Suggested color (e.g., CSS color name or hex code)
  grouping?: string; // Suggested grouping category
  emphasisProperties?: string[]; // Array of property names to emphasize
  progressIndicator?: ProgressIndicator; // Progress visualization guidance
  actionPriorities?: ActionPriorities; // Hints on which actions to emphasize
}

/**
 * 📊 Guidance for visualizing progress.
 */
export interface ProgressIndicator {
  type: ProgressIndicatorType;
  value: number;
  max?: number; // Required for fraction/steps type
  label?: string;
}

/**
 * 🎨 Guidance on emphasizing specific actions.
 */
export interface ActionPriorities {
  primary?: string; // Identifier of the primary action
  secondary?: string[]; // Identifiers of secondary actions
}

/**
 * 🗣️ Suggested prompt to guide conversation flow.
 */
export interface ConversationPrompt {
  type: PromptType;
  text: string;
  condition?: string; // Optional condition expression (e.g., "when state.current == 'pending'")
  priority?: PriorityLevel;
}

/**
 * 🔗 Link to a related resource
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
 * ⚙️ Configuration options for creating a resource
 */
export interface CognitiveResourceOptions {
  id: string;
  type: ResourceTypeLiteral;
  properties?: Record<string, unknown>;
  actions?: Record<string, Action>;
  links?: Link[];
} 