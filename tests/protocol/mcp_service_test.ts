// tests/protocol/mcp_service_test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { CognitiveStore } from "../../src/infrastracture/store/store.ts";
import { createBridge, CognitiveBridge } from "../../src/infrastracture/protocol/bridge.ts";
import { createMcpService, McpService } from "../../src/infrastracture/protocol/mcp.ts";

// Mock transport implementation for testing
class MockTransport {
  private responseQueue: Array<(message: any) => void> = [];
  private bridge: CognitiveBridge;
  public messages: Array<Record<string, unknown>> = [];
  public onmessage?: (message: Record<string, unknown>) => void;

  constructor(bridge: CognitiveBridge) {
    this.bridge = bridge;
  }

  async start(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }

  async send(message: Record<string, unknown>): Promise<void> {
    this.messages.push(message);
    if (this.responseQueue.length > 0) {
      const callback = this.responseQueue.shift();
      callback?.(message);
    }
    return Promise.resolve();
  }

  // Mock client sending a request to the server
  async sendRequest(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const messageId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return new Promise((resolve) => {
      // Queue a callback to handle the response
      this.responseQueue.push((response) => {
        if (response.id === messageId) {
          resolve(response);
        }
      });
      
      // Send the request as if from client
      if (this.onmessage) {
        this.onmessage({
          id: messageId,
          method,
          params
        });
      }
    });
  }
}

// Helper to setup test environment
async function setupTestEnvironment() {
  // Setup storage adapter
  const storage: any = {
    // Mock implementation for testing
    async create(type: string, id: string, data: Record<string, unknown>): Promise<void> {
      console.log(`Mock create ${type}/${id}`, data);
    },
    async get(type: string, id: string): Promise<Record<string, unknown> | null> {
      if (type === "test" && id === "123") {
        return { id: "123", name: "Test Resource" };
      }
      return null;
    },
    async update(type: string, id: string, data: Record<string, unknown>): Promise<void> {
      console.log(`Mock update ${type}/${id}`, data);
    },
    async delete(type: string, id: string): Promise<void> {
      console.log(`Mock delete ${type}/${id}`);
    },
    async list(type: string, options?: any): Promise<{ items: Array<Record<string, unknown>>; totalItems: number }> {
      if (type === "test") {
        return {
          items: [
            { id: "123", name: "Test Resource" },
            { id: "456", name: "Another Resource" }
          ],
          totalItems: 2
        };
      }
      return { items: [], totalItems: 0 };
    }
  };

  const store = new CognitiveStore(storage);
  const bridge = createBridge(store);
  const mcpService = createMcpService(bridge);
  const transport = new MockTransport(bridge);
  
  return { store, bridge, mcpService, transport };
}

Deno.test("MCP Service - Connect and Process Messages", async (t) => {
  const { mcpService, transport } = await setupTestEnvironment();
  
  await t.step("should connect to transport", async () => {
    await mcpService.connect(transport);
    // Successful if no errors thrown
  });
  
  await t.step("should handle explore request", async () => {
    const response = await transport.sendRequest("explore", {
      uri: "/test"
    });
    
    assertExists(response.result);
    assertEquals((response.result as any).items.length, 2);
  });
  
  await t.step("should handle individual resource explore", async () => {
    const response = await transport.sendRequest("explore", {
      uri: "/test/123"
    });
    
    assertExists(response.result);
    assertEquals((response.result as any).id, "123");
  });
  
  await t.step("should handle act request", async () => {
    const response = await transport.sendRequest("act", {
      uri: "/test/123",
      action: "update",
      payload: { status: "active" }
    });
    
    assertExists(response.result);
  });
  
  await t.step("should handle create request", async () => {
    const response = await transport.sendRequest("create", {
      uri: "/test",
      payload: { name: "New Resource" }
    });
    
    assertExists(response.result);
  });
  
  await t.step("should handle error case with appropriate response", async () => {
    const response = await transport.sendRequest("explore", {
      uri: "/nonexistent/999"
    });
    
    assertExists(response.error);
    assertEquals(typeof (response.error as any).message, "string");
  });
  
  await t.step("should disconnect cleanly", async () => {
    await mcpService.disconnect();
    // Successful if no errors thrown
  });
}); 