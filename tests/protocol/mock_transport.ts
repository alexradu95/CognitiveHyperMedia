// Define an interface for the transport rather than importing the module
export interface McpServerTransport {
  clientMeta: { name: string; version: string };
  serverMeta: { name: string; version: string };
  onRequest(requestType: string, callback: (request: any) => Promise<any>): void;
  sendRequest(request: any): Promise<any>;
  connect(): Promise<void>;
}

/**
 * A mock implementation of McpServerTransport for testing
 */
export class MockTransport implements McpServerTransport {
  clientMeta = { name: "Test Client", version: "1.0.0" };
  serverMeta = { name: "Test Server", version: "1.0.0" };
  callbacks: Record<string, (request: any) => Promise<any>> = {};
  
  /**
   * Register a callback for a specific request type
   */
  onRequest(requestType: string, callback: (request: any) => Promise<any>): void {
    this.callbacks[requestType] = callback;
  }
  
  /**
   * Send a message to the client
   */
  async sendRequest(request: any): Promise<any> {
    return { id: "mock-response-id", result: {} };
  }
  
  /**
   * Mock the connect method
   */
  async connect(): Promise<void> {
    return Promise.resolve();
  }
} 