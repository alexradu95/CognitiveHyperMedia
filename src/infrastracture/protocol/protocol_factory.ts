import { CognitiveStore } from "../../main.ts";
import { IProtocolAdapter } from "./protocol_adapter.ts";
import { McpProtocol, McpOptions } from "./mcp.ts";

/**
 * 🔧 Factory for creating protocol implementations
 */
export class ProtocolFactory {
  /**
   * Create a new MCP protocol implementation
   * 
   * @param store - CognitiveStore instance to connect to
   * @param options - MCP-specific options
   * @returns A new MCP protocol implementation
   */
  static createMcpProtocol(store: CognitiveStore, options?: McpOptions): IProtocolAdapter {
    return new McpProtocol(store, options);
  }
} 