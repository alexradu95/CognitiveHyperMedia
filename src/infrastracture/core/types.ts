/**
 * 📚 Core structure for a Cognitive Hypermedia resource.
 */
export interface CognitiveResource {
    _id: string;
    _type: string;
    [propertyName: string]: unknown;
  
    _actions?: Record<string, Action>;
    _state?: ResourceState;
    _relationships?: Record<string, Relationship>;
    _presentation?: PresentationHints;
    _prompts?: ConversationPrompt[];
}
  
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
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
    required?: boolean;
    default?: unknown;
    options?: unknown[];
    min?: number;
    max?: number;
    pattern?: string;
}
  
  /**
   * 📚 Representation of the state of a resource.
   */
  export interface ResourceState {
    current: string;
    description?: string;
    allowedTransitions?: string[];
    disallowedTransitions?: DisallowedTransition[];
    history?: StateHistoryEntry[];
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
    actor?: string; // Identifier for the user/agent causing the transition
  }
  
  /**
   * 🧩 Definition of a relationship between resources.
   */
  export interface Relationship {
    type: string;
    id?: string;
    preview?: Record<string, unknown>; // Abbreviated representation
    cardinality?: "one" | "many";
    role?: string; // Describes the role of this resource in the relationship
  }
  
  /**
   * 🎨 Guidance on how a resource should be visualized.
   */
  export interface PresentationHints {
    priority?: "high" | "medium" | "low";
    visualization?: string; // e.g., 'card', 'listItem', 'detailView'
    icon?: string; // e.g., 'task', 'document'
    color?: string; // e.g., 'blue', '#ff0000'
    grouping?: string; // Category for UI grouping
    emphasisProperties?: string[]; // Property names to highlight
    progressIndicator?: ProgressIndicator;
    actionPriorities?: ActionPriorities;
  }
  
  /**
   * 📊 Guidance for visualizing progress.
   */
  export interface ProgressIndicator {
    type: "percentage" | "fraction" | "steps";
    value: number;
    max?: number;
    label?: string;
  }
  
  /**
   * 🎨 Guidance on emphasizing specific actions.
   */
  export interface ActionPriorities {
    primary?: string; // Action ID to be presented as primary
    secondary?: string[]; // Action IDs for secondary emphasis
  }
  
  /**
   * 🗣️ Suggested prompt to guide conversation flow.
   */
  export interface ConversationPrompt {
    type: "follow-up" | "confirmation" | "explanation" | "suggestion";
    text: string;
    condition?: string; // Optional condition (e.g., "when state.current == 'pending'")
    priority?: "high" | "medium" | "low";
  }
  
  /**
   * 📚 Structure for a collection of resources.
   */
  export interface CognitiveCollection extends CognitiveResource {
    _type: "collection";
    itemType: string; // The type of resource contained in the collection
    items: CognitiveResource[];
    pagination?: PaginationInfo;
    filters?: Record<string, unknown>; // Filters applied to generate this collection
    aggregates?: Record<string, unknown>; // Summary data for the collection
  }
  
  /**
   * 📄 Information for paginating through collections.
   */
  export interface PaginationInfo {
    page: number;
    pageSize: number;
    totalItems?: number;
    totalPages?: number;
  }
  
  /**
   * 🚨 Standard representation for errors.
   */
  export interface CognitiveError {
    _type: "error";
    code: string; // Application-specific error code
    message: string; // Human-readable error message
    details?: Record<string, unknown>; // Additional error details
    recoveryActions?: RecoveryAction[]; // Suggested actions to recover
    _prompts?: ConversationPrompt[]; // Prompts for error handling conversation
  }
  
  /**
   * 🛠️ Suggested action to recover from an error.
   */
  export interface RecoveryAction {
    description: string;
    action: string; // Action ID
    parameters?: Record<string, unknown>;
  }