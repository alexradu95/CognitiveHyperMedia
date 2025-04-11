/**
 * ✨ Example showing how to use the bridge and MCP implementation
 */

import { CognitiveStore } from "../src/store/store.ts";
import { CognitiveResource } from "../src/core/resource.ts";
import { createBridge } from "../src/protocol/bridge.ts";
import { createMcpService } from "../src/protocol/mcp.ts";
import { IStorageAdapter, ListOptions, ListResult } from "../src/store/store.ts";

async function main() {
  const logFile = "bridge-example.log";
  
  async function log(message: string) {
    // Log to console
    console.log(message);
    // Append to log file
    await Deno.writeTextFile(logFile, message + "\n", { append: true });
  }
  
  try {
    // Clear previous log
    await Deno.writeTextFile(logFile, "=== BRIDGE EXAMPLE LOG ===\n");
    
    await log("Creating in-memory storage...");
    // Create a simple in-memory storage adapter
    const inMemoryStorage = new InMemoryStorage();
    const store = new CognitiveStore(inMemoryStorage);
    await log("✅ Store created successfully!");
    
    // Create bridge and MCP service
    const bridge = createBridge(store);
    await log("✅ Bridge created.");
    
    const mcpService = createMcpService(bridge);
    await log("✅ MCP service created.");
    
    await log("Creating and accessing resources...");
    
    // Create a resource using the storage adapter
    const resource = await inMemoryStorage.create("example", { name: "Test Resource", status: "active" });
    const resourceId = resource.getId();
    await log(`Created resource with ID: ${resourceId}`);
    
    // Test bridge explore
    const exploreResult = await bridge.explore(`/example/${resourceId}`);
    if ((exploreResult as any)._type === "error") {
      await log(`❌ Error exploring resource: ${(exploreResult as any).message}`);
    } else {
      await log(`✅ Explored resource: ${JSON.stringify(exploreResult)}`);
    }
    
    // Test bridge navigation
    const resourceWithLink = await inMemoryStorage.create("parent", { name: "Parent Resource" });
    const parentId = resourceWithLink.getId();
    await log(`Created parent resource with ID: ${parentId}`);
    
    // Add a link to the resource
    resource.addLink({
      rel: "parent",
      href: `/parent/${parentId}`
    });
    
    // Update the resource with the link
    await inMemoryStorage.update("example", resourceId, resource.toJSON().properties);
    
    // Test navigation
    const navResult = await bridge.navigateRelation(`/example/${resourceId}`, "parent");
    if ((navResult as any)._type === "error") {
      await log(`❌ Error navigating relation: ${(navResult as any).message}`);
    } else {
      await log(`✅ Successfully navigated to parent: ${JSON.stringify(navResult)}`);
    }
    
    await log("Example completed successfully! ✨");
  } catch (error: unknown) {
    const errorMessage = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    await Deno.writeTextFile(logFile, errorMessage, { append: true });
  }
}

/**
 * Simple in-memory storage adapter for testing
 */
class InMemoryStorage implements IStorageAdapter {
  private data: Map<string, Map<string, Record<string, unknown>>> = new Map();
  
  async create(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    if (!this.data.has(type)) {
      this.data.set(type, new Map());
    }
    this.data.get(type)!.set(id, data);
  }

  async get(type: string, id: string): Promise<Record<string, unknown> | null> {
    if (!this.data.has(type) || !this.data.get(type)!.has(id)) {
      return null;
    }
    
    const data = this.data.get(type)!.get(id)!;
    return data;
  }
  
  async update(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    if (!this.data.has(type) || !this.data.get(type)!.has(id)) {
      throw new Error(`Resource ${id} of type ${type} not found`);
    }
    
    this.data.get(type)!.set(id, data);
  }
  
  async delete(type: string, id: string): Promise<void> {
    if (this.data.has(type)) {
      this.data.get(type)!.delete(id);
    }
  }
  
  async list(type: string, options?: ListOptions): Promise<ListResult> {
    if (!this.data.has(type)) {
      return { items: [], totalItems: 0 };
    }
    
    let items = Array.from(this.data.get(type)!.values());
    const totalItems = items.length;
    
    // Handle pagination
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    items = items.slice(startIndex, endIndex);
    
    return { items, totalItems };
  }
  
  async listTypes(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
  
  // Helper method for the bridge example
  async getCollection(type: string): Promise<CognitiveResource> {
    const { items, totalItems } = await this.list(type);
    
    const collection = new CognitiveResource({
      id: type,
      type: "collection",
      properties: {
        name: `${type} Collection`,
        count: totalItems,
        items
      }
    });
    
    return collection;
  }
  
  async performAction(type: string, id: string, action: string, params: Record<string, unknown>): Promise<CognitiveResource | null> {
    const resource = await this.get(type, id);
    if (!resource) return null;
    
    // Handle updating properties
    if (action === "update") {
      const properties = resource.getProperties();
      const updatedProperties: Record<string, unknown> = {};
      
      // Convert properties Map to Record
      for (const [key, value] of properties.entries()) {
        updatedProperties[key] = value;
      }
      
      // Merge with new parameters
      const mergedData = { ...updatedProperties, ...params };
      
      return await this.update(type, id, mergedData);
    }
    
    return resource;
  }
}

if (import.meta.main) {
  main();
} 