import { CognitiveStore, IProtocolAdapter } from "../../main.ts";
import { McpAdapterOptions, McpProtocolAdapter } from "./mcp_adapter.ts";

/**
 * 🏭 Factory for creating different protocol adapters
 */
export class ProtocolFactory {
  /**
   * Create an MCP protocol adapter
   * 
   * @param store - Store to connect the adapter to
   * @param options - MCP specific options
   * @returns An MCP protocol adapter
   */
  static createMcpAdapter(store: CognitiveStore, options: McpAdapterOptions = {}): McpProtocolAdapter {
    return new McpProtocolAdapter(store, options);
  }

  
  /**
   * Create the default protocol adapter based on configuration
   * 
   * @param store - Store to connect the adapter to
   * @param protocolType - Type of protocol to create
   * @param options - Protocol specific options
   * @returns A protocol adapter
   */
  static createAdapter(
    store: CognitiveStore, 
    protocolType: ProtocolType = "mcp",
    options: Record<string, unknown> = {}
  ): IProtocolAdapter {
    switch (protocolType) {
      case "mcp":
        return this.createMcpAdapter(store, options as McpAdapterOptions);
      // Future protocol types can be added here
      default:
        throw new Error(`Unsupported protocol type: ${protocolType}`);
    }
  }
}

/**
 * Supported protocol types
 */
export type ProtocolType = "mcp" | "openai" | "other"; // Add new protocol types as needed 