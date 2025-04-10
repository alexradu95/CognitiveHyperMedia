import { CognitiveBridge } from "./bridge.ts";

/**
 * 🌉 Simple MCP service that connects to a CognitiveBridge
 */
export class McpService {
  private bridge: CognitiveBridge;
  private transport: any = null;

  /**
   * Create a new MCP service
   * 
   * @param bridge - CognitiveBridge to use for operations
   */
  constructor(bridge: CognitiveBridge) {
    this.bridge = bridge;
  }

  /**
   * 🔄 Connect to the transport
   */
  async connect(transport: any): Promise<void> {
    this.transport = transport;
    
    // Set up message handlers for the transport
    transport.onmessage = async (message: any) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error("Error handling message:", error);
        this.sendErrorResponse(message.id, error);
      }
    };
    
    await transport.start();
  }

  /**
   * 🚪 Disconnect from the transport
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  /**
   * 📨 Handle incoming messages
   */
  private async handleMessage(message: any): Promise<void> {
    if (!message || !message.id || !message.method) {
      return;
    }

    // Handle different method calls
    switch (message.method) {
      case "explore":
        await this.handleExplore(message);
        break;
      case "act":
        await this.handleAct(message);
        break;
      case "create":
        await this.handleCreate(message);
        break;
      default:
        this.sendErrorResponse(message.id, `Unknown method: ${message.method}`);
    }
  }

  /**
   * 🔍 Handle explore requests
   */
  private async handleExplore(message: any): Promise<void> {
    const { uri } = message.params || {};
    
    if (!uri) {
      return this.sendErrorResponse(message.id, "Missing uri parameter");
    }
    
    try {
      const result = await this.bridge.explore(uri);
      if (!result) {
        return this.sendErrorResponse(message.id, `Resource not found: ${uri}`);
      }
      this.sendSuccessResponse(message.id, result);
    } catch (error) {
      this.sendErrorResponse(message.id, error);
    }
  }

  /**
   * ⚡ Handle act requests
   */
  private async handleAct(message: any): Promise<void> {
    const { uri, action, payload } = message.params || {};
    
    if (!uri || !action) {
      return this.sendErrorResponse(message.id, "Missing uri or action parameter");
    }
    
    try {
      const result = await this.bridge.act(uri, action, payload);
      if (!result) {
        return this.sendErrorResponse(message.id, `Action failed: ${action}`);
      }
      this.sendSuccessResponse(message.id, result);
    } catch (error) {
      this.sendErrorResponse(message.id, error);
    }
  }

  /**
   * ➕ Handle create requests
   */
  private async handleCreate(message: any): Promise<void> {
    const { uri, payload } = message.params || {};
    
    if (!uri || !payload) {
      return this.sendErrorResponse(message.id, "Missing uri or payload parameter");
    }
    
    try {
      const result = await this.bridge.create(uri, payload);
      if (!result) {
        return this.sendErrorResponse(message.id, `Create failed for: ${uri}`);
      }
      this.sendSuccessResponse(message.id, result);
    } catch (error) {
      this.sendErrorResponse(message.id, error);
    }
  }

  /**
   * ✅ Send a success response
   */
  private sendSuccessResponse(id: string, result: any): void {
    if (!this.transport) return;
    
    this.transport.send({
      id,
      result
    });
  }

  /**
   * ❌ Send an error response
   */
  private sendErrorResponse(id: string, error: any): void {
    if (!this.transport) return;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.transport.send({
      id,
      error: {
        message: errorMessage
      }
    });
  }
}

/**
 * ✨ Creates a new MCP service connected to a bridge
 */
export function createMcpService(bridge: CognitiveBridge): McpService {
  return new McpService(bridge);
} 