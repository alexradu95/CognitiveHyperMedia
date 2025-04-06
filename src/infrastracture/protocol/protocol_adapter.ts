/**
 * 🔌 Interface for protocol adapters that can be used with the Cognitive framework.
 * Allows for protocol-agnostic communication with AI systems.
 * 
 * @interface IProtocolAdapter
 */
export interface IProtocolAdapter {
  /**
   * 🔍 Handle explore/read commands to retrieve resources
   * 
   * @param uri - The resource URI to explore
   * @returns Promise with the response containing status, headers and body
   */
  explore(uri: string): Promise<ProtocolResponse>;
  
  /**
   * ⚡ Handle action commands that modify resources
   * 
   * @param uri - The resource URI to act upon
   * @param action - The action to perform
   * @param payload - Optional data for the action
   * @returns Promise with the response containing status, headers and body
   */
  act(uri: string, action: string, payload?: Record<string, unknown>): Promise<ProtocolResponse>;
  
  /**
   * ➕ Handle create commands to create new resources
   * 
   * @param uri - The resource type URI
   * @param payload - Data for the new resource
   * @returns Promise with the response containing status, headers and body
   */
  create(uri: string, payload: Record<string, unknown>): Promise<ProtocolResponse>;

  /**
   * 🔄 Connect this protocol adapter to its transport layer
   * 
   * @returns Promise that resolves when connection is established
   */
  connect(): Promise<void>;

  /**
   * 🚪 Disconnect this protocol adapter from its transport layer
   * 
   * @returns Promise that resolves when disconnection is complete
   */
  disconnect(): Promise<void>;
}

/**
 * Response from a protocol operation
 */
export interface ProtocolResponse {
  status: number; // HTTP-like status code
  headers?: Record<string, string>; // Response headers
  body?: any; // Response body
}

/**
 * Options for protocol operations
 */
export interface ProtocolOptions {
  headers?: Record<string, string>; // Request headers
  timeout?: number; // Request timeout in milliseconds
}

/**
 * 🚨 Error thrown by protocol adapters
 */
export class ProtocolError extends Error {
  code: string;
  status: number;
  
  constructor(message: string, code: string = "protocol_error", status: number = 500) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
    this.status = status;
  }
} 