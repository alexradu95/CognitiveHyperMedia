# Cognitive Hypermedia Framework

A framework for creating cognitive hypermedia applications with stateful resources.

## Features

- Create stateful resources with well-defined state machines
- RESTful API design with hypermedia controls
- Built-in support for the Model Context Protocol (MCP)
- Deno KV storage adapter included

## Installation

```bash
# From JSR (recommended)
deno add @yourusername/cognitive-hypermedia

# From GitHub
deno add https://raw.githubusercontent.com/yourusername/cognitive-hypermedia/main/mod.ts
```

## Quick Start

```typescript
import { 
  StateMachineDefinition, 
  CognitiveStore, 
  createMcpBridge, 
  DenoKvAdapter 
} from "@yourusername/cognitive-hypermedia";

// Define a state machine
const taskStateMachine: StateMachineDefinition = {
  initialState: "pending",
  states: {
    pending: { 
      name: "pending", 
      description: "Task is waiting.", 
      allowedActions: { 
        start: {description: "Start"}, 
        cancel: {description: "Cancel"} 
      }, 
      transitions: { 
        start: { target: "inProgress" }, 
        cancel: { target: "cancelled" } 
      } 
    },
    // Add more states as needed
  },
};

// Initialize the store
const kv = await Deno.openKv();
const kvAdapter = new DenoKvAdapter(kv);
const store = new CognitiveStore(kvAdapter);

// Register your state machine
store.registerStateMachine("task", taskStateMachine);

// Create an MCP bridge to handle requests
const bridge = createMcpBridge(store);
```

## Examples

Check out the examples folder for complete applications:

- [Todo App](./examples/todo/app.ts): A simple todo application with tasks that can transition through different states.

Run an example:

```bash
deno task example:todo
```

## API Documentation

[Full API documentation](https://doc.deno.land/https://raw.githubusercontent.com/yourusername/cognitive-hypermedia/main/mod.ts)

## License

MIT
