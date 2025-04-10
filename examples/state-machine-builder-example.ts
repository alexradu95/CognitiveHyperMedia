/**
 * ✨ Example showing how to use the StateMachineBuilder with the simplified storage
 */

import { StorageFactory, StateMachineBuilder } from "../mod.ts";

async function main() {
  const logFile = "state-machine-builder-example.log";
  
  async function log(message: string) {
    // Log to console
    console.log(message);
    // Append to log file
    await Deno.writeTextFile(logFile, message + "\n", { append: true });
  }
  
  try {
    // Clear previous log
    await Deno.writeTextFile(logFile, "=== STATE MACHINE BUILDER EXAMPLE LOG ===\n");
    
    await log("Creating store...");
    // Create a cognitive store with Deno KV backend in one step
    const store = await StorageFactory.createStore();
    await log("✅ Store created successfully!");
    
    await log("Creating state machine definition...");
    // Create a state machine definition using the builder pattern
    const stateMachineDefinition = {
      initialState: "draft",
      states: {
        draft: {
          name: "draft",
          description: "Initial draft state",
          allowedActions: {
            submit: { description: "Submit for review" }
          },
          transitions: {
            submit: { target: "review" }
          }
        },
        review: {
          name: "review",
          description: "In review",
          allowedActions: {
            approve: { description: "Approve the document" },
            reject: { description: "Reject and return to draft" }
          },
          transitions: {
            approve: { target: "approved" },
            reject: { target: "draft" }
          }
        },
        approved: {
          name: "approved",
          description: "Approved document",
          allowedActions: {
            publish: { description: "Publish the document" }
          },
          transitions: {
            publish: { target: "published" }
          }
        },
        published: {
          name: "published",
          description: "Published document",
          allowedActions: {
            archive: { description: "Archive the document" }
          },
          transitions: {
            archive: { target: "archived" }
          }
        },
        archived: {
          name: "archived",
          description: "Archived document",
          allowedActions: {}
        }
      }
    };
    await log("✅ State machine definition created");
    
    // Register the state machine
    store.registerStateMachine("document", stateMachineDefinition);
    await log("✅ State machine registered for document type");
    
    // Create a document
    await log("Creating a document...");
    const document = await store.create("document", { 
      title: "Sample Document",
      content: "This is a sample document." 
    });
    
    await log(`✅ Document created with ID: ${document.getId()}`);
    await log(`Initial status: ${document.getProperty("status")}`);
    
    // Transition to review
    await log(`Submitting document for review...`);
    await store.performAction("document", document.getId(), "submit");
    
    // Check updated status
    const updated = await store.get("document", document.getId());
    await log(`✅ New status: ${updated?.getProperty("status")}`);
    
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