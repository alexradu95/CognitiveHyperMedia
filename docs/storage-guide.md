# 💾 Storage Implementation Guide

This guide explains how to use the simplified storage system in the Cognitive Hypermedia Framework.

## Overview

The storage system has been simplified to use a single implementation file with Deno KV as the default storage backend. This makes the codebase more maintainable while preserving the flexibility to add additional storage adapters in the future.

## Using Storage

### Creating a Store with Default Storage

The simplest way to create a `CognitiveStore` with storage is to use the static factory method:

```typescript
import { CognitiveStore } from "./store/store.ts";

// Create a store with default Deno KV storage
const store = await CognitiveStore.createWithStorage();

// Or specify a path for the KV database
const customStore = await CognitiveStore.createWithStorage("./data/myapp.db");
```

### Creating Storage Directly

If you need more control over the storage creation:

```typescript
import { createStorage } from "./storage/storage.ts";
import { CognitiveStore } from "./store/store.ts";

// Create storage
const storage = await createStorage();

// Create store with the storage
const store = new CognitiveStore(storage);
```

### Using the Storage APIs Directly

While typically you'll interact with storage through the `CognitiveStore`, you can use storage directly if needed:

```typescript
import { createStorage } from "./storage/storage.ts";

const storage = await createStorage();

// Create a resource
await storage.create("task", "123", {
  title: "Implement feature X",
  status: "pending"
});

// Get a resource
const task = await storage.get("task", "123");

// Update a resource
await storage.update("task", "123", {
  ...task,
  status: "completed"
});

// List resources
const tasks = await storage.list("task", {
  filter: { status: "pending" },
  page: 1,
  pageSize: 10
});

// Delete a resource
await storage.delete("task", "123");
```

## Storage Interface

The storage system implements the `IStorageAdapter` interface:

```typescript
interface IStorageAdapter {
  create(type: string, id: string, data: Record<string, unknown>): Promise<void>;
  get(type: string, id: string): Promise<Record<string, unknown> | null>;
  update(type: string, id: string, data: Record<string, unknown>): Promise<void>;
  delete(type: string, id: string): Promise<void>;
  list(type: string, options?: ListOptions): Promise<ListResult>;
  listTypes(): Promise<string[]>;
}
```

## Implementing Custom Storage

While the framework provides Deno KV storage out of the box, you can implement your own storage adapter by implementing the `IStorageAdapter` interface:

```typescript
import { IStorageAdapter, ListOptions, ListResult } from "../storage/storage.ts";

export class MyCustomStorage implements IStorageAdapter {
  // Implement all required methods from IStorageAdapter
  async create(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    // Your implementation here
  }
  
  // Implement all other methods...
}

// Then use your custom storage with CognitiveStore
const customStorage = new MyCustomStorage();
const store = new CognitiveStore(customStorage);
```

## Best Practices

1. **Use the higher-level `CognitiveStore` API** when possible, rather than using storage directly
2. **Leverage the static factory method** for simple creation in most cases
3. **Create custom storage implementations** only when you need specific database features
4. **Ensure data consistency** by avoiding direct manipulation of storage outside of the `CognitiveStore`

## Error Handling

Storage operations can throw errors in various situations:

```typescript
try {
  const resource = await store.get("task", "non-existent-id");
  if (!resource) {
    console.log("Resource not found");
  }
} catch (error) {
  console.error("Storage error:", error);
}
```

## Performance Considerations

The Deno KV storage implementation provides good performance for most use cases, but consider these tips:

1. Use pagination for large collections
2. Keep resource sizes reasonable
3. Use filtering at the storage level when possible
4. Be aware that some operations may require loading all records into memory 