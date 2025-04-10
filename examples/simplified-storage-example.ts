/**
 * ✨ Example showing how to use the simplified storage API
 */

import { StorageFactory, createBridge } from "../mod.ts";

async function main() {
  // OLD WAY:
  // const kv = await Deno.openKv();
  // const storage = StorageFactory.createDenoKvStorageWithInstance(kv);
  // const store = new CognitiveStore(storage);
  
  // NEW WAY:
  // Create a cognitive store with Deno KV backend in one step
  const store = await StorageFactory.createStore();
  console.log("Store created successfully!");
  
  // Now you can use the store as before
  const bridge = createBridge(store);
  
  // Register a simple state machine
  store.registerStateMachine("example", {
    initialState: "new",
    states: {
      new: {
        name: "new",
        description: "A newly created item",
        allowedActions: {
          start: {
            description: "Start the item"
          }
        },
        transitions: {
          start: { target: "active" }
        }
      },
      active: {
        name: "active",
        description: "An active item",
        allowedActions: {
          complete: {
            description: "Complete the item"
          }
        },
        transitions: {
          complete: { target: "completed" }
        }
      },
      completed: {
        name: "completed",
        description: "A completed item",
        allowedActions: {}
      }
    }
  });
  
  // Example of creating and using an action to transition a resource
  await store.create("example", { name: "Test Resource" });
  
  // Use performAction to transition between states
  const updated = await store.performAction("example", "123", "start");
  
  const resource = await store.get("example", "123");
  console.log("Resource status:", resource?.getProperty("status"));
}

if (import.meta.main) {
  main();
} 