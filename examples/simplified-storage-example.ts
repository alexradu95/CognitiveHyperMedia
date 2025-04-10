/**
 * ✨ Example showing how to use the simplified storage API
 */

import { StorageFactory, createBridge } from "../mod.ts";

async function main() {
  const logFile = "simplified-storage-example.log";
  
  async function log(message: string) {
    // Log to console
    console.log(message);
    // Append to log file
    await Deno.writeTextFile(logFile, message + "\n", { append: true });
  }
  
  try {
    // Clear previous log
    await Deno.writeTextFile(logFile, "=== SIMPLIFIED STORAGE EXAMPLE LOG ===\n");
    
    await log("Creating store...");
    // OLD WAY:
    // const kv = await Deno.openKv();
    // const storage = StorageFactory.createDenoKvStorageWithInstance(kv);
    // const store = new CognitiveStore(storage);
    
    // NEW WAY:
    // Create a cognitive store with Deno KV backend in one step
    const store = await StorageFactory.createStore();
    await log("✅ Store created successfully!");
    
    // Now you can use the store as before
    const bridge = createBridge(store);
    await log("✅ Bridge created.");
    
    await log("Registering state machine...");
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
    await log("✅ State machine registered.");
    
    // Example of creating and using an action to transition a resource
    await log("Creating resource...");
    const resource = await store.create("example", { name: "Test Resource" });
    await log(`✅ Created resource with ID: ${resource.getId()}`);
    
    // Use performAction to transition between states
    const resourceId = resource.getId();
    await log(`Performing 'start' action on resource ${resourceId}...`);
    const updated = await store.performAction("example", resourceId, "start");
    await log(`✅ Updated resource status: ${updated?.getProperty("status")}`);
    
    // Get the resource to verify
    await log(`Retrieving resource ${resourceId}...`);
    const retrieved = await store.get("example", resourceId);
    await log(`✅ Retrieved resource status: ${retrieved?.getProperty("status")}`);
    
    await log("\nExample completed successfully! ✨");
    await log(`Check the log file '${logFile}' for complete output.`);
  } catch (error: unknown) {
    const errorMessage = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    await Deno.writeTextFile(logFile, errorMessage, { append: true });
  }
}

if (import.meta.main) {
  main();
} 