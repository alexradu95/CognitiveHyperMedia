/**
 * 🚨 Base class for all application-specific errors.
 */
export class AppError extends Error {
  /**
   * Creates a new application error.
   */
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
  
/**
 * 🚨 Error indicating a resource was not found.
 */
export class ResourceNotFoundError extends AppError {
  readonly resourceType: string;
  readonly resourceId: string;

  /**
   * Creates a new resource not found error.
   */
  constructor(resourceType: string, resourceId: string) {
    super(`Resource ${resourceType}/${resourceId} not found`);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  /**
   * Creates a ResourceNotFoundError from resource type and ID.
   */
  static fromResource(resourceType: string, resourceId: string): ResourceNotFoundError {
    return new ResourceNotFoundError(resourceType, resourceId);
  }
}
  
/**
 * 🚨 Error indicating an invalid state transition was attempted.
 */
export class InvalidStateTransitionError extends AppError {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly currentState: string;
  readonly targetState: string;

  /**
   * Creates a new invalid state transition error.
   */
  constructor(
    resourceType: string,
    resourceId: string,
    currentState: string,
    targetState: string,
  ) {
    super(
      `Invalid state transition from ${currentState} to ${targetState} for ${resourceType}/${resourceId}`,
    );
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.currentState = currentState;
    this.targetState = targetState;
  }

  /**
   * Creates an InvalidStateTransitionError with a simplified API.
   */
  static fromTransition(
    { resourceType, resourceId, from, to }: 
    { resourceType: string; resourceId: string; from: string; to: string }
  ): InvalidStateTransitionError {
    return new InvalidStateTransitionError(resourceType, resourceId, from, to);
  }
}
  
/**
 * 🚨 Error indicating an invalid action was attempted.
 */
export class InvalidActionError extends AppError {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly action: string;

  /**
   * Creates a new invalid action error.
   */
  constructor(resourceType: string, resourceId: string, action: string) {
    super(`Action ${action} not available for ${resourceType}/${resourceId}`);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.action = action;
  }

  /**
   * Creates an InvalidActionError with a simplified API.
   */
  static fromAction(
    { resourceType, resourceId, action }: 
    { resourceType: string; resourceId: string; action: string }
  ): InvalidActionError {
    return new InvalidActionError(resourceType, resourceId, action);
  }
}
  
/**
 * 🚨 Error during MCP interaction.
 */
export class McpError extends AppError {
  readonly code: string;

  /**
   * Creates a new MCP error.
   */
  constructor(message: string, code = "mcp_error") {
    super(message);
    this.code = code;
  }

  /**
   * Creates a McpError with a specific error code.
   */
  static withCode(message: string, code: string): McpError {
    return new McpError(message, code);
  }
}