# Protocol Adapter Implementation

## Overview

The protocol adapter pattern allows the Cognitive Hypermedia framework to support various AI interaction protocols without tightly coupling the core business logic to any specific protocol implementation. This architectural decision provides flexibility and future-proofing against changes in the AI protocol landscape.

## Architecture

The implementation consists of several key components:

1. **IProtocolAdapter Interface**: Defines a standard API for all protocol implementations
2. **CognitiveBridge**: Protocol-agnostic bridge connecting the store to any protocol adapter
3. **Protocol-specific Adapters**: Implementations for specific protocols (e.g., MCP)
4. **ProtocolFactory**: Factory for creating the appropriate protocol adapter

## Key Components

### IProtocolAdapter Interface

This interface defines the core methods any protocol adapter must implement:

```typescript
export interface IProtocolAdapter {
  // Retrieve resources (similar to GET)
  explore(uri: string): Promise<ProtocolResponse>;
  
  // Perform actions on resources (similar to POST with action)
  act(uri: string, action: string, payload?: Record<string, unknown>): Promise<ProtocolResponse>;
  
  // Create new resources (similar to POST)
  create(uri: string, payload: Record<string, unknown>): Promise<ProtocolResponse>;

  // Establish connection to the protocol transport
  connect(): Promise<void>;

  // Disconnect from the protocol transport
  disconnect(): Promise<void>;
}
```

### CognitiveBridge

The bridge acts as a mediator between the application and protocol adapters:

```typescript
export class CognitiveBridge {
  private store: CognitiveStore;
  private adapter: IProtocolAdapter;

  constructor(store: CognitiveStore, adapter: IProtocolAdapter) {
    this.store = store;
    this.adapter = adapter;
  }
  
  async explore(uri: string): Promise<any> {
    return this.adapter.explore(uri);
  }

  async act(uri: string, action: string, payload?: Record<string, unknown>): Promise<any> {
    return this.adapter.act(uri, action, payload);
  }
  
  async create(uri: string, payload: Record<string, unknown>): Promise<any> {
    return this.adapter.create(uri, payload);
  }
}
```

### McpProtocolAdapter

The MCP-specific implementation of the protocol adapter:

```typescript
export class McpProtocolAdapter implements IProtocolAdapter {
  private store: CognitiveStore;
  private mcp: McpServer;
  private transport: McpServerTransport | null = null;

  // Implementation of IProtocolAdapter methods
  async explore(uri: string): Promise<ProtocolResponse> {
    // MCP-specific implementation
  }
  
  async act(uri: string, action: string, payload?: Record<string, unknown>): Promise<ProtocolResponse> {
    // MCP-specific implementation
  }
  
  async create(uri: string, payload: Record<string, unknown>): Promise<ProtocolResponse> {
    // MCP-specific implementation
  }
  
  // MCP-specific methods
  setTransport(transport: McpServerTransport): void {
    this.transport = transport;
  }
  
  private registerTools(): void {
    // Register MCP-specific tools
  }
}
```

### ProtocolFactory

Factory for creating protocol adapters:

```typescript
export class ProtocolFactory {
  static createMcpAdapter(store: CognitiveStore, options: McpAdapterOptions = {}): McpProtocolAdapter {
    return new McpProtocolAdapter(store, options);
  }

  static createAdapter(
    store: CognitiveStore, 
    protocolType: ProtocolType = "mcp",
    options: Record<string, unknown> = {}
  ): IProtocolAdapter {
    switch (protocolType) {
      case "mcp":
        return this.createMcpAdapter(store, options as McpAdapterOptions);
      // Future protocol types will be added here
      default:
        throw new Error(`Unsupported protocol type: ${protocolType}`);
    }
  }
}

export type ProtocolType = "mcp" | "openai" | "other"; // Extensible for future protocols
```

## Usage in Application

Here's how the protocol adapter pattern is used in the application:

```typescript
// During application initialization
const store = new CognitiveStore(storageAdapter);

// Create the appropriate protocol adapter
const protocolAdapter = ProtocolFactory.createAdapter(store, "mcp", {
  name: "Cognitive Hypermedia",
  version: "1.0.0"
});

// For MCP, set the transport
if (protocolAdapter instanceof McpProtocolAdapter) {
  protocolAdapter.setTransport(new StdioTransport());
}

// Create the bridge with the protocol adapter
const bridge = createBridge(store, protocolAdapter);

// Connect the protocol adapter
await protocolAdapter.connect();

// Use the bridge to interact with resources
const response = await bridge.explore("/tasks/task-123");
```

## Benefits

1. **Protocol Agnosticism**: Core business logic is independent of any specific protocol
2. **Extensibility**: New protocols can be added without changing existing code
3. **Testability**: Easy to mock protocol adapters for testing
4. **Separation of Concerns**: Clear boundaries between protocol handling and business logic
5. **Future-Proofing**: If new AI protocols emerge, we can add adapters without rearchitecting the system

## Future Extensions

The architecture can be extended to support:

1. **Multi-protocol Support**: Using multiple protocols simultaneously
2. **Protocol Negotiation**: Dynamically selecting protocol based on client capabilities
3. **Protocol Transformers**: Converting between different protocol formats
4. **Plugin System**: Extending protocol adapters with custom functionality

## Implementation Notes

Currently, the MCP adapter uses mock implementations of the MCP SDK classes for development and testing. In a production environment, these would be replaced with the actual MCP SDK imports. 