// tests/protocol/bridge_test.ts

import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { StateMachineDefinition } from "../../src/infrastracture/core/statemachine.ts";
import { createBridge } from "../../src/adapters/protocol/bridge.ts";
import { ProtocolFactory } from "../../src/adapters/protocol/protocol_factory.ts";
import { CognitiveStore } from "../../src/infrastracture/store/store.ts";
import { MockTransport } from "./mock_transport.ts";

// Mock implementation of IStorageAdapter to avoid Deno.Kv dependency issues
class MockStorageAdapter {
  private data: Map<string, Map<string, Record<string, unknown>>> = new Map();

  async create(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    if (!this.data.has(type)) {
      this.data.set(type, new Map());
    }
    this.data.get(type)!.set(id, { ...data });
  }

  async get(type: string, id: string): Promise<Record<string, unknown> | null> {
    return this.data.get(type)?.get(id) || null;
  }

  async update(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    if (!this.data.has(type) || !this.data.get(type)!.has(id)) {
      throw new Error(`Resource ${type}/${id} not found`);
    }
    this.data.get(type)!.set(id, { ...data });
  }

  async delete(type: string, id: string): Promise<void> {
    if (this.data.has(type)) {
      this.data.get(type)!.delete(id);
    }
  }

  async list(type: string, options?: {
    filter?: Record<string, unknown>,
    page?: number,
    pageSize?: number
  }): Promise<{ items: Array<Record<string, unknown>>; totalItems: number }> {
    if (!this.data.has(type)) {
      return { items: [], totalItems: 0 };
    }
    
    let items = Array.from(this.data.get(type)!.entries()).map(([id, data]) => ({ 
      id, 
      ...data 
    }));
    
    // Apply filters if any
    if (options?.filter) {
      items = items.filter(item => {
        for (const [key, value] of Object.entries(options.filter!)) {
          // Use type assertion to handle the dynamic property access
          const itemValue = (item as Record<string, unknown>)[key];
          if (itemValue !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    const totalItems = items.length;
    
    // Apply pagination if specified
    if (options?.page && options?.pageSize) {
      const startIndex = (options.page - 1) * options.pageSize;
      items = items.slice(startIndex, startIndex + options.pageSize);
    }
    
    return { items, totalItems };
  }
}

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
async function setupTestEnvironment() {
  const storage = new MockStorageAdapter();
  const store = new CognitiveStore(storage as any); // Use 'as any' to bypass type checking
  store.registerStateMachine("task", taskStateMachineDefinition);
  
  const mockTransport = new MockTransport();
  const mcpAdapter = ProtocolFactory.createMcpAdapter(store);
  mcpAdapter.setTransport(mockTransport);
  
  const bridge = createBridge(store, mcpAdapter);
  
  return { store, bridge, storage, adapter: mcpAdapter };
}

Deno.test("Protocol Bridge - Create", async (t) => {
  const { bridge, store, storage } = await setupTestEnvironment();

  await t.step("should create a resource successfully", async () => {
    const response = await bridge.create("/widget", { name: "New Widget", color: "blue" });

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
});

Deno.test("Protocol Bridge - Explore", async (t) => {
  const { bridge, store } = await setupTestEnvironment();
  
  // Pre-populate some data
  const task1 = await store.create("task", { title: "Explore Task 1", status: "pending" });
  await new Promise(resolve => setTimeout(resolve, 10)); // Add delay
  const task2 = await store.create("task", { title: "Explore Task 2", color: "red" });
  await new Promise(resolve => setTimeout(resolve, 10)); // Add delay
  await store.create("widget", { name: "W1" });

  await t.step("should retrieve a single existing resource", async () => {
    const response = await bridge.explore(`/task/${task1.getId()}`);

    assertEquals(response.status, 200);
    assertExists(response.body);
    assertEquals(response.body.id, task1.getId());
    assertEquals(response.body.type, "task");
    assertEquals(response.body.properties?.title, "Explore Task 1");
    assertExists(response.body.actions?.start, "Should have state-specific actions");
  });

  await t.step("should retrieve a collection with filter", async () => {
    const response = await bridge.explore("/task?color=red");

    assertEquals(response.status, 200);
    assertExists(response.body);
    assertEquals(response.body.items.length, 1, "Should retrieve 1 red task");
    assertEquals(response.body.items[0]?.id, task2.getId());
    assertExists(response.body.filters);
    assertEquals(response.body.filters?.color, "red");
  });
});

Deno.test("Protocol Bridge - Act", async (t) => {
  const { bridge, store } = await setupTestEnvironment();
  const task = await store.create("task", { title: "Action Task" }); // Starts 'pending'
  const taskId = task.getId();

  await t.step("should perform a valid action and transition state", async () => {
    const response = await bridge.act(`/task/${taskId}`, "start");

    assertEquals(response.status, 200, "Status should be 200 OK");
    assertExists(response.body, "Response body should contain updated resource");
    assertEquals(response.body.id, taskId);
    assertEquals(response.body.properties?.status, "inProgress", "Status should be inProgress");
    assertExists(response.body.actions?.complete, "'complete' action should now exist");

    // Verify persistence
    const updatedTask = await store.get("task", taskId);
    assertEquals(updatedTask?.getProperty("status"), "inProgress");
  });
}); 