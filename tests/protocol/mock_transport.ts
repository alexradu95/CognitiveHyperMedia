// Define an interface for the transport compatible with Transport from the MCP SDK
export interface McpServerTransport {
  // Properties from Transport interface
  start(): Promise<void>;
  send(message: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: Record<string, unknown>) => void;
  
  // Additional properties we need for testing
  clientMeta?: { name: string; version: string };
  serverMeta?: { name: string; version: string };
}

/**
 * A mock implementation of McpServerTransport for testing
 */
export class MockTransport implements McpServerTransport {
  clientMeta = { name: "Test Client", version: "1.0.0" };
  serverMeta = { name: "Test Server", version: "1.0.0" };
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: Record<string, unknown>) => void;
  callbacks: Record<string, (request: any) => Promise<any>> = {};
  
  /**
   * Start the transport connection
   */
  async start(): Promise<void> {
    return Promise.resolve();
  }
  
  /**
   * Send a message to the server/client
   */
  async send(message: Record<string, unknown>): Promise<void> {
    // In a real implementation, this would send the message over the transport
    console.log("MockTransport.send:", message);
    return Promise.resolve();
  }
  
  /**
   * Close the transport connection
   */
  async close(): Promise<void> {
    if (this.onclose) {
      this.onclose();
    }
    return Promise.resolve();
  }
  
  /**
   * Register a callback for a specific request type (backward compatibility)
   */
  onRequest(requestType: string, callback: (request: any) => Promise<any>): void {
    this.callbacks[requestType] = callback;
  }
  
  /**
   * Send a request and get a response (backward compatibility)
   */
  async sendRequest(request: any): Promise<any> {
    return { id: "mock-response-id", result: {} };
  }
  
  /**
   * Mock the connect method (backward compatibility)
   */
  async connect(): Promise<void> {
    return this.start();
  }
} 