import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { CognitiveCollection } from "../../src/infrastracture/core/collection.ts";
import { CognitiveResource } from "../../src/infrastracture/core/resource.ts";
import { PaginationInfo } from "../../src/infrastracture/core/types.ts";



Deno.test("CognitiveCollection - Creation and Basic Serialization", () => {
  const collection = new CognitiveCollection({
    id: "tasks-coll-1",
    itemType: "task",
  });

  assertExists(collection);
  assertEquals(collection.getId(), "tasks-coll-1");
  assertEquals(collection.getType(), "collection");
  assertEquals(collection.getProperty("itemType"), "task"); // Check itemType property

  let jsonOutput = collection.toJSON() as Record<string, any>;
  assertEquals(jsonOutput.id, "tasks-coll-1");
  assertEquals(jsonOutput.type, "collection");
  assertEquals((jsonOutput.properties as Record<string, any>).itemType, "task");
  assertExists(jsonOutput.items, "Items array should exist");
  assertEquals(jsonOutput.items, [], "Items array should be empty initially");
});

Deno.test("CognitiveCollection - Item Management and Serialization", () => {
  const collection = new CognitiveCollection({
    id: "docs-coll-2",
    itemType: "document",
  });

  const doc1 = new CognitiveResource({
    id: "doc-1",
    type: "document",
    properties: { title: "Doc 1" },
  });
  const doc2 = new CognitiveResource({
    id: "doc-2",
    type: "document",
    properties: { title: "Doc 2" },
  });

  // Add items
  collection.addItem(doc1);
  collection.addItem(doc2);

  // Verify retrieval
  const items = collection.getItems();
  assertEquals(items.length, 2);
  assertEquals(items[0], doc1);
  assertEquals(items[1], doc2);

  // Verify serialization includes items
  const jsonOutput = collection.toJSON() as Record<string, any>;
  assertExists(jsonOutput.items);
  assertEquals((jsonOutput.items as unknown[]).length, 2);
  
  // Check that items are serialized correctly using their own toJSON
  // Updated to match current implementation
  const item0 = (jsonOutput.items as any[])[0] as Record<string, any>;
  const item1 = (jsonOutput.items as any[])[1] as Record<string, any>;
  
  assertEquals(item0.id, "doc-1");
  assertEquals(item0.type, "document");
  assertEquals((item0.properties as Record<string, any>).title, "Doc 1");
  assertEquals(item1.id, "doc-2");
  assertEquals(item1.type, "document");
  assertEquals((item1.properties as Record<string, any>).title, "Doc 2");

  // Verify other collection properties
  assertEquals(jsonOutput.id, "docs-coll-2");
  assertEquals((jsonOutput.properties as Record<string, any>).itemType, "document");
});

Deno.test("CognitiveCollection - Pagination Management and Serialization", () => {
  const collection = new CognitiveCollection({
    id: "paged-coll-1",
    itemType: "comment",
  });

  // Initially, no pagination
  let jsonOutput = collection.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "pagination"), false, "pagination should not exist initially");

  // Define pagination info
  const pagination: PaginationInfo = {
    page: 2,
    pageSize: 10,
    totalItems: 55,
    totalPages: 6,
  };

  // Set pagination
  collection.setPagination(pagination);

  // Verify serialization
  jsonOutput = collection.toJSON() as Record<string, any>;
  assertExists(jsonOutput.pagination, "pagination should exist after being set");
  assertEquals(jsonOutput.pagination, pagination);

  // Verify other properties remain
  assertEquals(jsonOutput.id, "paged-coll-1");
  assertEquals((jsonOutput.properties as Record<string, any>).itemType, "comment");
  assertEquals((jsonOutput.items as unknown[]).length, 0);
});

Deno.test("CognitiveCollection - Filters Management and Serialization", () => {
  const collection = new CognitiveCollection({
    id: "filtered-coll-1",
    itemType: "product",
  });

  // Initially, no filters
  let jsonOutput = collection.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "filters"), false, "filters should not exist initially");

  // Define filters
  const filters = {
    category: "electronics",
    inStock: true,
    maxPrice: 100,
  };

  // Set filters
  collection.setFilters(filters);

  // Verify serialization
  jsonOutput = collection.toJSON() as Record<string, any>;
  assertExists(jsonOutput.filters, "filters should exist after being set");
  assertEquals(jsonOutput.filters, filters);

  // Verify other properties remain
  assertEquals(jsonOutput.id, "filtered-coll-1");
  assertEquals((jsonOutput.properties as Record<string, any>).itemType, "product");
  assertEquals((jsonOutput.items as unknown[]).length, 0);
  assertEquals(Object.hasOwn(jsonOutput, "pagination"), false);
});

Deno.test("CognitiveCollection - Aggregates Management and Serialization", () => {
  const collection = new CognitiveCollection({
    id: "agg-coll-1",
    itemType: "order",
  });

  // Initially, no aggregates
  let jsonOutput = collection.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "aggregates"), false, "aggregates should not exist initially");

  // Define aggregates
  const aggregates = {
    totalValue: 1578.50,
    statusDistribution: {
      pending: 5,
      shipped: 12,
      delivered: 25,
    },
    averageItemsPerOrder: 2.3,
  };

  // Set aggregates
  collection.setAggregates(aggregates);

  // Verify serialization
  jsonOutput = collection.toJSON() as Record<string, any>;
  assertExists(jsonOutput.aggregates, "aggregates should exist after being set");
  assertEquals(jsonOutput.aggregates, aggregates);

  // Verify other properties remain
  assertEquals(jsonOutput.id, "agg-coll-1");
  assertEquals((jsonOutput.properties as Record<string, any>).itemType, "order");
  assertEquals((jsonOutput.items as unknown[]).length, 0);
  assertEquals(Object.hasOwn(jsonOutput, "pagination"), false);
  assertEquals(Object.hasOwn(jsonOutput, "filters"), false);
}); 