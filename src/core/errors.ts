/**
 * 🚨 Base class for all application-specific errors.
 */
export class AppError extends Error {
    constructor(message: string) {
      super(message);
      this.name = this.constructor.name;
    }
  }
  
/**
 * 🚨 Error indicating a resource was not found.
 */
export class ResourceNotFoundError extends AppError {
constructor(resourceType: string, resourceId: string) {
    super(`Resource ${resourceType}/${resourceId} not found`);
}
}
  
/**
 * 🚨 Error indicating an invalid state transition was attempted.
 */
export class InvalidStateTransitionError extends AppError {
constructor(
    resourceType: string,
    resourceId: string,
    currentState: string,
    targetState: string,
) {
    super(
    `Invalid state transition from ${currentState} to ${targetState} for ${resourceType}/${resourceId}`,
    );
}
}
  
/**
 * 🚨 Error indicating an invalid action was attempted.
 */
export class InvalidActionError extends AppError {
constructor(resourceType: string, resourceId: string, action: string) {
    super(`Action ${action} not available for ${resourceType}/${resourceId}`);
}
}
  
/**
 * 🚨 Error during MCP interaction.
 */
export class McpError extends AppError {
constructor(message: string, public code: string = "mcp_error") {
    super(message);
}
}