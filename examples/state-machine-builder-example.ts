/**
 * ✨ Example showing how to use the StateMachineBuilder with the simplified storage
 */

import { StorageFactory, StateMachineBuilder } from "../mod.ts";

async function main() {
  // Create a cognitive store with Deno KV backend in one step
  const store = await StorageFactory.createStore();
  console.log("Store created successfully!");
  
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
  
  // Register the state machine
  store.registerStateMachine("document", stateMachineDefinition);
  
  // Create a document
  const document = await store.create("document", { 
    title: "Sample Document",
    content: "This is a sample document." 
  });
  
  console.log("Document created:", document.getId());
  console.log("Initial status:", document.getProperty("status"));
  
  // Transition to review
  await store.performAction("document", document.getId(), "submit");
  
  // Check updated status
  const updated = await store.get("document", document.getId());
  console.log("New status:", updated?.getProperty("status"));
}

if (import.meta.main) {
  main();
} 