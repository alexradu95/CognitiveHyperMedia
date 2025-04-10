/**
 * 🚨 Base class for all application-specific errors.
 */
export class AppError extends Error {
  readonly code: string;

  /**
   * Creates a new application error.
   */
  constructor(message: string, code = "app_error") {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }

  /**
   * Converts the error to a CognitiveError object for API responses
   */
  toCognitiveError() {
    return {
      _type: "error",
      code: this.code,
      message: this.message,
      details: this.getErrorDetails()
    };
  }

  /**
   * Gets additional error details for inclusion in CognitiveError
   * Override in subclasses to provide specific details
   */
  protected getErrorDetails(): Record<string, unknown> {
    return {};
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
    super(`Resource ${resourceType}/${resourceId} not found`, "resource_not_found");
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  /**
   * Creates a ResourceNotFoundError from resource type and ID.
   */
  static fromResource(resourceType: string, resourceId: string): ResourceNotFoundError {
    return new ResourceNotFoundError(resourceType, resourceId);
  }

  /**
   * Gets additional error details
   */
  protected override getErrorDetails(): Record<string, unknown> {
    return {
      resourceType: this.resourceType,
      resourceId: this.resourceId
    };
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
      "invalid_state_transition"
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

  /**
   * Gets additional error details
   */
  protected override getErrorDetails(): Record<string, unknown> {
    return {
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      currentState: this.currentState,
      targetState: this.targetState
    };
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
    super(`Action '${action}' not found on resource ${resourceType}/${resourceId}`, "invalid_action");
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

  /**
   * Gets additional error details
   */
  protected override getErrorDetails(): Record<string, unknown> {
    return {
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      action: this.action
    };
  }
}

/**
 * 🚨 Error during parameter validation.
 */
export class ValidationError extends AppError {
  readonly validationErrors: Record<string, string>;

  /**
   * Creates a new validation error.
   */
  constructor(message: string, validationErrors: Record<string, string> = {}) {
    super(message, "validation_error");
    this.validationErrors = validationErrors;
  }

  /**
   * Gets additional error details
   */
  protected override getErrorDetails(): Record<string, unknown> {
    return {
      validationErrors: this.validationErrors
    };
  }
}
  
/**
 * 🚨 Error during MCP interaction.
 */
export class McpError extends AppError {
  /**
   * Creates a new MCP error.
   */
  constructor(message: string, code = "mcp_error") {
    super(message, code);
  }

  /**
   * Creates a McpError with a specific error code.
   */
  static withCode(message: string, code: string): McpError {
    return new McpError(message, code);
  }
}

/**
 * 🚨 Error with authentication or authorization.
 */
export class AuthError extends AppError {
  /**
   * Creates a new auth error.
   */
  constructor(message: string, code = "auth_error") {
    super(message, code);
  }

  /**
   * Creates an AuthError for authentication failures.
   */
  static authentication(message: string): AuthError {
    return new AuthError(message, "authentication_error");
  }

  /**
   * Creates an AuthError for authorization failures.
   */
  static authorization(message: string): AuthError {
    return new AuthError(message, "authorization_error");
  }
}

/**
 * 🧰 Utility function to convert any error to a CognitiveError
 * 
 * @param error - Any error (AppError, Error, or unknown)
 * @returns A standardized CognitiveError object
 */
export function toCognitiveError(error: unknown): any {
  // If it's already an AppError, use its conversion method
  if (error instanceof AppError) {
    return error.toCognitiveError();
  }
  
  // If it's a standard Error, create a generic cognitive error
  if (error instanceof Error) {
    return {
      _type: "error",
      code: "unknown_error",
      message: error.message
    };
  }
  
  // For anything else, convert to string
  return {
    _type: "error",
    code: "unknown_error",
    message: String(error)
  };
}