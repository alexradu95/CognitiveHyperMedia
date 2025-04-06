/**
 * 🌐 Protocol Adapters
 * 
 * This module contains adapters for various AI interaction protocols.
 */

// Export protocol adapter interface
export { ProtocolError } from "./protocol_adapter.ts";
export type { IProtocolAdapter, ProtocolResponse, ProtocolOptions } from "./protocol_adapter.ts";

// Export MCP adapter implementation
export { McpProtocolAdapter } from "./mcp_adapter.ts";
export type { McpAdapterOptions } from "./mcp_adapter.ts";

// Export bridge
export { CognitiveBridge, createBridge } from "./bridge.ts";
export type { Bridge } from "./bridge.ts";

// Export factory
export { ProtocolFactory } from "./protocol_factory.ts";
export type { ProtocolType } from "./protocol_factory.ts"; 