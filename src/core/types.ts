/**
 * 📚 Core types for the Cognitive Hypermedia framework
 * 
 * This file serves as the central repository for all shared types used across
 * the framework. All types should be defined here to avoid duplication.
 */

// ----------------------------------------------------------------------------
// PRIMITIVE AND LITERAL TYPES
// ----------------------------------------------------------------------------

/**
 * 🏷️ Common resource type literals
 */
export type ResourceTypeLiteral = 'collection' | 'error' | string;

/**
 * 🏷️ Priority levels used throughout the framework
 */
export type PriorityLevel = 'high' | 'medium' | 'low';

/**
 * 🏷️ Parameter types for action parameters
 */
export type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * 🏷️ Relationship cardinality options
 */
export type Cardinality = 'one' | 'many';

/**
 * 🏷️ Progress indicator types
 */
export type ProgressIndicatorType = 'percentage' | 'fraction' | 'steps';

/**
 * 🏷️ Conversation prompt types
 */
export type PromptType = 'follow-up' | 'confirmation' | 'explanation' | 'suggestion';

// ----------------------------------------------------------------------------
// CORE RESOURCE INTERFACES
// ----------------------------------------------------------------------------

/**
 * 📚 Core structure for a Cognitive Hypermedia resource.
 */
export interface CognitiveResource {
    _id: string;
    _type: ResourceTypeLiteral;
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
    type: ParameterType;
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
 * 📚 Entry in the state history.
 */
export interface StateHistoryEntry {
  from: string;
  to: string;
  timestamp: string;
  action?: string;
  actor?: string;
  reason?: string;
}

/**
 * 📚 Information about a disallowed state transition.
 */
export interface DisallowedTransition {
  target: string;
  reason: string;
}

/**
 * 🧩 Definition of a relationship between resources.
 */
export interface Relationship {
  type: string;
  id?: string;
  preview?: Record<string, unknown>; // Abbreviated representation
  cardinality?: Cardinality;
  role?: string; // Describes the role of this resource in the relationship
}

// ----------------------------------------------------------------------------
// PRESENTATION AND VISUALIZATION
// ----------------------------------------------------------------------------

/**
 * 🎨 Guidance on how a resource should be visualized.
 */
export interface PresentationHints {
  priority?: PriorityLevel;
  visualization?: string; // e.g., 'card', 'listItem', 'detailView'
  icon?: string; // e.g., 'task', 'document'
  color?: string; // e.g., 'blue', '#ff0000'
  grouping?: string; // Category for UI grouping
  emphasisProperties?: string[]; // Property names to highlight
  progressIndicator?: ProgressIndicator;
  actionPriorities?: ActionPriorities;
  primaryProperty?: string; // Main property to display
  secondaryProperty?: string; // Supporting property to display
  metadata?: string[]; // Properties to show as metadata fields
}

/**
 * 📊 Guidance for visualizing progress.
 */
export interface ProgressIndicator {
  type: ProgressIndicatorType;
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
 * 💬 Guidance on suggested conversation prompts.
 */
export interface ConversationPrompt {
  type: PromptType;
  text: string;
  action?: string; // Related action ID that can be triggered
  priority?: PriorityLevel;
}

// ----------------------------------------------------------------------------
// COLLECTION-RELATED INTERFACES
// ----------------------------------------------------------------------------

/**
 * 📚 Structure for a collection of resources.
 */
export interface CognitiveCollection extends CognitiveResource {
  _type: 'collection';
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

// ----------------------------------------------------------------------------
// ERROR-RELATED INTERFACES
// ----------------------------------------------------------------------------

/**
 * 🚨 Standard representation for errors.
 */
export interface CognitiveError {
  _type: 'error';
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

/**
 * 🧰 Type guard to check if an object is a cognitive error
 */
export function isError(obj: unknown): obj is CognitiveError {
  return obj !== null && 
         typeof obj === 'object' && 
         '_type' in obj && 
         (obj as { _type: string })._type === 'error';
}

// ----------------------------------------------------------------------------
// STORAGE-RELATED INTERFACES
// ----------------------------------------------------------------------------

/**
 * 📋 Options for listing resources
 */
export interface ListOptions {
  filter?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sort?: SortOptions;
}

/**
 * 📋 Sort direction for storage queries
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 📋 Sorting options for storage queries
 */
export interface SortOptions {
  field: string;
  direction: SortDirection;
}

/**
 * 📋 Result of a list operation
 */
export interface ListResult {
  items: Record<string, unknown>[];
  totalItems: number;
}

/**
 * 🧰 Type guard to check if a resource is a collection
 */
export function isCollection(resource: CognitiveResource): resource is CognitiveCollection {
  return resource._type === 'collection';
}

/**
 * 🧰 Helper to create a new empty resource with required fields
 */
export function createEmptyResource(id: string, type: string): CognitiveResource {
  return {
    _id: id,
    _type: type
  };
}