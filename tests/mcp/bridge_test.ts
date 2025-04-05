// tests/mcp/bridge_test.ts
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CognitiveStore } from "../../src/store/store.ts";
import { createMcpBridge, McpBridge } from "../../src/mcp/bridge.ts";
import { StateMachineDefinition } from "../../src/core/statemachine.ts";
import { CognitiveResource } from "../../src/core/resource.ts";
import { CognitiveCollection } from "../../src/core/collection.ts";

// --- Reuse Task State Machine Definition ---
const taskStateMachineDefinition: StateMachineDefinition = {
  initialState: "pending",
  states: {
    pending: {
      name: "pending", description: "Task is waiting.",
      allowedActions: {
        start: {description: "Start"},
        cancel: {description: "Cancel"},
        update: {description: "Update Task Details"},
        delete: {description: "Delete Task", confirmation: "Are you sure?"}
      },
      transitions: { start: { target: "inProgress" }, cancel: { target: "cancelled" } }
    },
    inProgress: {
      name: "inProgress", description: "Task is active.",
      allowedActions: {
        complete: {description: "Complete"},
        block: {description: "Block"},
        update: {description: "Update Task Details"},
        delete: {description: "Delete Task", confirmation: "Are you sure?"}
      },
      transitions: { complete: { target: "completed" }, block: { target: "blocked" } }
    },
    blocked: {
      name: "blocked", description: "Task is blocked.",
      allowedActions: {
        unblock: {description: "Unblock"},
        cancel: {description: "Cancel"},
        update: {description: "Update Task Details"},
        delete: {description: "Delete Task", confirmation: "Are you sure?"}
      },
      transitions: { unblock: { target: "inProgress" }, cancel: { target: "cancelled" } }
    },
    completed: { name: "completed", description: "Task is done.", allowedActions: { archive: {description: "Archive"} }, transitions: { archive: { target: "archived" } } },
    cancelled: { name: "cancelled", description: "Task cancelled.", allowedActions: {} },
    archived: { name: "archived", description: "Task archived.", allowedActions: {} },
  },
};
// ---

// Helper to setup store and bridge for tests
async function setupTestEnvironment(): Promise<{ store: CognitiveStore, bridge: McpBridge, kv: Deno.Kv }> {
  const kv = await Deno.openKv(":memory:");
  const store = new CognitiveStore(kv);
  store.registerStateMachine("task", taskStateMachineDefinition);
  const bridge = createMcpBridge(store);
  return { store, bridge, kv };
}

Deno.test("MCP Bridge - handleCreate", async (t) => {
  const { bridge, store, kv } = await setupTestEnvironment();

  await t.step("should create a resource successfully", async () => {
    const command = { uri: "/widget", payload: { name: "New Widget", color: "blue" } };
    const response = await bridge.handleCreate(command);

    assertEquals(response.status, 201, "Status should be 201 Created");
    assertExists(response.headers?.Location, "Location header should exist");
    assert(response.headers?.Location?.startsWith("/widget/"), "Location should point to new resource");
    assertExists(response.body, "Response body should exist");
    assertEquals(response.body.type, "widget");
    assertEquals(response.body.properties?.name, "New Widget");

    // Verify in store
    const id = response.headers.Location.split('/')[2];
    const resource = await store.get("widget", id);
    assertExists(resource);
    assertEquals(resource?.getProperty("name"), "New Widget");
  });

  await t.step("should return 400 for invalid URI", async () => {
    const command = { uri: "/widget/invalid", payload: { name: "Fail" } };
    const response = await bridge.handleCreate(command);
    assertEquals(response.status, 400);
    assert(response.body?.error?.includes("Invalid URI"));
  });

   await t.step("should return 400 for missing payload", async () => {
    const command = { uri: "/widget", payload: {} }; // Empty payload
    const response = await bridge.handleCreate(command);
    assertEquals(response.status, 400);
    assert(response.body?.error?.includes("Payload is required"));
  });


  await kv.close();
});

Deno.test("MCP Bridge - handleExplore", async (t) => {
  const { bridge, store, kv } = await setupTestEnvironment();
  // Pre-populate some data
  const task1 = await store.create("task", { title: "Explore Task 1", status: "pending" }); // Status should be set by create
  await new Promise(resolve => setTimeout(resolve, 10)); // Add delay
  const task2 = await store.create("task", { title: "Explore Task 2", color: "red" });
  await new Promise(resolve => setTimeout(resolve, 10)); // Add delay
  await store.create("widget", { name: "W1" });

  await t.step("should retrieve a single existing resource", async () => {
    const command = { uri: `/task/${task1.getId()}` };
    const response = await bridge.handleExplore(command);

    assertEquals(response.status, 200);
    assertExists(response.body);
    assertEquals(response.body.id, task1.getId());
    assertEquals(response.body.type, "task");
    assertEquals(response.body.properties?.title, "Explore Task 1");
    assertExists(response.body.actions?.start, "Should have state-specific actions");
  });

  await t.step("should return 404 for non-existent resource", async () => {
    const command = { uri: "/task/non-existent-id" };
    const response = await bridge.handleExplore(command);
    assertEquals(response.status, 404);
    assert(response.body?.error?.includes("not found"));
  });

  await t.step("should retrieve a collection", async () => {
     const command = { uri: "/task" };
     const response = await bridge.handleExplore(command);

     assertEquals(response.status, 200);
     assertExists(response.body);
     assertEquals(response.body.type, "collection");
     assertEquals(response.body.properties?.itemType, "task");
     assert(Array.isArray(response.body.items));
     assertEquals(response.body.items.length, 2, "Should retrieve 2 tasks");
     assertExists(response.body.pagination);
  });

   await t.step("should retrieve a collection with filter", async () => {
     const command = { uri: "/task?color=red" }; // Assuming filter parsing works
     const response = await bridge.handleExplore(command);

     assertEquals(response.status, 200);
     assertExists(response.body);
     assertEquals(response.body.items.length, 1, "Should retrieve 1 red task");
     assertEquals(response.body.items[0]?.id, task2.getId());
     assertExists(response.body.filters);
     assertEquals(response.body.filters?.color, "red");
  });

  await t.step("should retrieve a collection with pagination", async () => {
     const command = { uri: "/task?page=2&pageSize=1" };
     const response = await bridge.handleExplore(command);

     assertEquals(response.status, 200);
     assertExists(response.body);
     assertEquals(response.body.items.length, 1, "Should retrieve 1 task on page 2");
     // Note: depends on the default sort order (createdAt)
     assertEquals(response.body.items[0]?.id, task2.getId(), "Second created task should be on page 2");
     assertEquals(response.body.pagination?.page, 2);
     assertEquals(response.body.pagination?.pageSize, 1);
     assertEquals(response.body.pagination?.totalItems, 2);
     assertEquals(response.body.pagination?.totalPages, 2);
  });


  await t.step("should return 400 for invalid URI path", async () => {
     const command = { uri: "/" };
     const response = await bridge.handleExplore(command);
     assertEquals(response.status, 400);
  });

   await t.step("should return 400 for invalid URI path structure", async () => {
     const command = { uri: "/task/id/extra" };
     const response = await bridge.handleExplore(command);
     assertEquals(response.status, 400);
  });


  await kv.close();
});

Deno.test("MCP Bridge - handleAct", async (t) => {
 const { bridge, store, kv } = await setupTestEnvironment();
  const task = await store.create("task", { title: "Action Task" }); // Starts 'pending'
  const taskId = task.getId();

  await t.step("should perform a valid action and transition state", async () => {
    const command = { uri: `/task/${taskId}`, action: "start" };
    const response = await bridge.handleAct(command);

    assertEquals(response.status, 200, "Status should be 200 OK");
    assertExists(response.body, "Response body should contain updated resource");
    assertEquals(response.body.id, taskId);
    assertEquals(response.body.properties?.status, "inProgress", "Status should be inProgress");
    assertExists(response.body.actions?.complete, "'complete' action should now exist");

    // Verify persistence
    const updatedTask = await store.get("task", taskId);
    assertEquals(updatedTask?.getProperty("status"), "inProgress");
  });

  await t.step("should perform a delete action successfully", async () => {
    const deleteCommand = { uri: `/task/${taskId}`, action: "delete" }; // Assuming delete is allowed in 'inProgress' (it is by default now)
    const response = await bridge.handleAct(deleteCommand);

    assertEquals(response.status, 204, "Status should be 204 No Content");
    assertEquals(response.body, undefined, "Body should be empty on delete");

    // Verify deletion
    const deletedTask = await store.get("task", taskId);
    assertEquals(deletedTask, null);
  });

  // Recreate task for error tests
  const task2 = await store.create("task", { title: "Error Task" });
  const task2Id = task2.getId();


  await t.step("should return 404 if resource not found", async () => {
    const command = { uri: "/task/non-existent", action: "start" };
    const response = await bridge.handleAct(command);
    assertEquals(response.status, 404);
  });

  await t.step("should return 403 if action not allowed in state", async () => {
    // Task is 'pending', 'complete' is not allowed
    const command = { uri: `/task/${task2Id}`, action: "complete" };
    const response = await bridge.handleAct(command);
    assertEquals(response.status, 403, "Should be 403 Forbidden"); // Check status code
    assert(response.body?.error?.includes("not allowed"), "Error message should mention not allowed");
  });


  await t.step("should return 400 if payload required but missing", async () => {
    // 'update' requires payload
    const command = { uri: `/task/${task2Id}`, action: "update" };
    const response = await bridge.handleAct(command);
    assertEquals(response.status, 400);
    assert(response.body?.error?.includes("Payload is required"));
  });

  await t.step("should return 400 for invalid URI", async () => {
    const command = { uri: `/task`, action: "start" }; // Missing ID
    const response = await bridge.handleAct(command);
    assertEquals(response.status, 400);
  });

   await t.step("should return 400 for missing action name", async () => {
    const command = { uri: `/task/${task2Id}`, action: "" }; // Missing action
    const response = await bridge.handleAct(command);
    assertEquals(response.status, 400);
     assert(response.body?.error?.includes("Action name is required"));
  });

  await kv.close();
}); 