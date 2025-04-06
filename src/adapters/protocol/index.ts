
/**
 * 🌐 Protocol Adapters
 * 
 * This module contains adapters for various AI interaction protocols.
 */

// Export protocol adapter interface
export { ProtocolError } from "../../infrastracture/protocol/protocol_adapter.ts";
export type { IProtocolAdapter, ProtocolResponse, ProtocolOptions } from "../../infrastracture/protocol/protocol_adapter.ts";

// Export MCP adapter implementation
export { McpProtocolAdapter } from "./mcp_adapter.ts";
export type { McpAdapterOptions } from "./mcp_adapter.ts";

// Export Navigation adapter
export { NavigationAdapter } from "../../infrastracture/protocol/navigation_adapter.ts";
export type { ResourceGraph, ResourceNode, ResourceEdge } from "../../infrastracture/protocol/navigation_adapter.ts";

// Export bridge
export { CognitiveBridge, createBridge } from "../../infrastracture/protocol/bridge.ts";
export type { Bridge } from "../../infrastracture/protocol/bridge.ts";

// Export factory
export { ProtocolFactory } from "./protocol_factory.ts";
export type { ProtocolType } from "./protocol_factory.ts"; 