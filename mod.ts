/**
 * ✨ Cognitive Hypermedia Framework
 * 
 * A framework for creating cognitive hypermedia applications with stateful resources.
 */

// Core exports
export * from "./src/infrastracture/core/statemachine.ts";
export * from "./src/infrastracture/store/store.ts";
export * from "./src/infrastracture/store/storage_adapter.ts";

// Logging and Debugging
export * from "./src/infrastracture/core/logger.ts";
export * from "./src/infrastracture/core/debug.ts";

// Protocol
export * from "./src/infrastracture/protocol/index.ts";

// Storage
export * from "./src/infrastracture/storage/index.ts";

// Legacy Adapters (if still needed)
export * from "./src/adapters/logging/index.ts";

// Additional utilities and types
// Add more exports here as needed 