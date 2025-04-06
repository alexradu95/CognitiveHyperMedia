import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { CognitiveResource, Action, ResourceState, Relationship, PresentationHints, ConversationPrompt } from "../../src/infrastracture/core/resource.ts";

Deno.test("CognitiveResource - Creation and Basic Serialization", () => {
  const resource = new CognitiveResource({
    id: "test-id-123",
    type: "test-type",
  });

  assertExists(resource);
  assertEquals(resource.getId(), "test-id-123");
  assertEquals(resource.getType(), "test-type");

  const jsonOutput = resource.toJSON() as Record<string, any>;
  assertEquals(jsonOutput.id, "test-id-123");
  assertEquals(jsonOutput.type, "test-type");
  assertExists(jsonOutput.links, "Links should exist");
  assertEquals(jsonOutput.links.length, 1, "Should have self link");
  assertEquals(jsonOutput.links[0].rel, "self");
  assertEquals(jsonOutput.links[0].href, "/test-type/test-id-123");
});

Deno.test("CognitiveResource - Properties and Serialization", () => {
  const resource = new CognitiveResource({
    id: "prop-test-456",
    type: "widget",
    properties: {
      name: "Test Widget",
      color: "blue",
      count: 42,
    },
  });

  assertEquals(resource.getProperty("name"), "Test Widget");
  assertEquals(resource.getProperty("color"), "blue");
  assertEquals(resource.getProperty("count"), 42);
  assertEquals(resource.getProperty("nonexistent"), undefined);

  resource.setProperty("color", "red");
  assertEquals(resource.getProperty("color"), "red");

  resource.setProperty("newProp", true);
  assertEquals(resource.getProperty("newProp"), true);

  const jsonOutput = resource.toJSON() as Record<string, any>;
  assertEquals(jsonOutput.id, "prop-test-456");
  assertEquals(jsonOutput.type, "widget");
  assertExists(jsonOutput.properties, "Properties should exist");
  assertEquals(jsonOutput.properties.name, "Test Widget");
  assertEquals(jsonOutput.properties.color, "red");
  assertEquals(jsonOutput.properties.count, 42);
  assertEquals(jsonOutput.properties.newProp, true);
});

Deno.test("CognitiveResource - Actions Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "action-test-789",
    type: "document",
  });

  // Initially, no actions should be present
  let jsonOutput = resource.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "actions"), false, "actions should not exist when empty");
  assertEquals(resource.getAction("submit"), undefined);

  // Define some actions
  const submitAction: Action = {
    description: "Submit the document for review",
    effect: "Changes status to submitted",
  };
  const publishAction: Action = {
    description: "Publish the document",
    parameters: {
      notifySubscribers: { type: "boolean", default: true },
    },
  };

  // Add actions
  resource.addAction("submit", submitAction);
  resource.addAction("publish", publishAction);

  // Verify actions can be retrieved
  assertEquals(resource.getAction("submit"), submitAction);
  assertEquals(resource.getAction("publish"), publishAction);
  assertEquals(resource.getAction("nonexistentAction"), undefined);

  // Verify serialization includes actions
  jsonOutput = resource.toJSON() as Record<string, any>;
  assertExists(jsonOutput.actions, "actions should exist after adding actions");
  assertEquals(jsonOutput.actions.submit, submitAction);
  assertEquals(jsonOutput.actions.publish, publishAction);

  // Verify original properties are still there
  assertEquals(jsonOutput.id, "action-test-789");
  assertEquals(jsonOutput.type, "document");
});

Deno.test("CognitiveResource - State Management and Serialization", () => {
  // Resource without initial state
  const resource1 = new CognitiveResource({
    id: "state-test-1",
    type: "ticket",
  });

  let jsonOutput1 = resource1.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput1, "_state"), false, "_state should not exist initially");
  assertEquals(resource1.getCurrentState(), undefined, "Initial state should be undefined");

  // Set state
  const initialState: ResourceState = {
    current: "open",
    description: "Ticket is open and awaiting assignment",
    allowedTransitions: ["assign", "close"],
  };
  resource1.setState(initialState);

  assertEquals(resource1.getCurrentState(), "open");

  // Verify serialization includes state
  jsonOutput1 = resource1.toJSON() as Record<string, any>;
  assertExists(jsonOutput1._state, "_state should exist after being set");
  assertEquals(jsonOutput1._state, initialState);

  // Resource with initial state via constructor (Optional enhancement, test later if implemented)
  const complexState: ResourceState = {
    current: "in-progress",
    description: "Work is underway",
    allowedTransitions: ["complete", "pause"],
    disallowedTransitions: [
      { action: "assign", reason: "Ticket is already assigned" },
    ],
    history: [
      {
        state: "open",
        enteredAt: "2024-01-01T10:00:00Z",
        exitedAt: "2024-01-01T11:30:00Z",
        actor: "user-123",
      },
    ],
  };

  // Update state
  resource1.setState(complexState);
  assertEquals(resource1.getCurrentState(), "in-progress");
  jsonOutput1 = resource1.toJSON() as Record<string, any>;
  assertEquals(jsonOutput1._state, complexState);

  // Verify other properties are still intact
  assertEquals(jsonOutput1.id, "state-test-1");
  assertEquals(jsonOutput1.type, "ticket");
});

Deno.test("CognitiveResource - Relationships Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "rel-test-1",
    type: "project",
  });

  // Initially, no relationships
  let jsonOutput = resource.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "_relationships"), false, "_relationships should not exist initially");
  assertEquals(resource.getRelationship("owner"), undefined);

  // Define relationships
  const ownerRel: Relationship = {
    type: "user",
    id: "user-123",
    preview: { name: "Alice" },
    cardinality: "one",
    role: "Owner",
  };
  const tasksRel: Relationship = {
    type: "task",
    cardinality: "many",
    preview: { count: 5, incomplete: 2 },
  };

  // Add relationships
  resource.addRelationship("owner", ownerRel);
  resource.addRelationship("tasks", tasksRel);

  // Verify retrieval
  assertEquals(resource.getRelationship("owner"), ownerRel);
  assertEquals(resource.getRelationship("tasks"), tasksRel);
  assertEquals(resource.getRelationship("nonexistent"), undefined);

  // Verify serialization
  jsonOutput = resource.toJSON() as Record<string, any>;
  assertExists(jsonOutput._relationships, "_relationships should exist after adding relationships");
  assertEquals(jsonOutput._relationships.owner, ownerRel);
  assertEquals(jsonOutput._relationships.tasks, tasksRel);

  // Verify other properties remain
  assertEquals(jsonOutput.id, "rel-test-1");
  assertEquals(jsonOutput.type, "project");
  assertEquals(Object.hasOwn(jsonOutput, "_state"), false);
});

Deno.test("CognitiveResource - Presentation Hints Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "pres-test-1",
    type: "task",
  });

  // Initially, no presentation hints
  let jsonOutput = resource.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "presentation"), false, "presentation should not exist initially");

  // Define presentation hints
  const hints: PresentationHints = {
    priority: "high",
    visualization: "card",
    icon: "task",
    color: "red",
    grouping: "urgent",
    emphasisProperties: ["dueDate", "priority"],
    progressIndicator: {
      type: "percentage",
      value: 75,
      label: "75% complete",
    },
    actionPriorities: {
      primary: "complete",
      secondary: ["pause", "assign"],
    },
  };

  // Set hints
  resource.setPresentation(hints);

  // Verify serialization
  jsonOutput = resource.toJSON() as Record<string, any>;
  assertExists(jsonOutput.presentation, "presentation should exist after setting hints");
  assertEquals(jsonOutput.presentation, hints);

  // Verify merging/updating hints (optional - could add separate test later)
  resource.setPresentation({ color: "blue", icon: "task-done" }); // Update some hints
  jsonOutput = resource.toJSON() as Record<string, any>;
  const updatedHints = jsonOutput.presentation as PresentationHints;
  assertEquals(updatedHints.color, "blue");
  assertEquals(updatedHints.icon, "task-done");
  assertEquals(updatedHints.priority, "high", "Original hints should persist if not overwritten");
  assertEquals(updatedHints.visualization, "card", "Original hints should persist if not overwritten");

  // Verify other properties remain
  assertEquals(jsonOutput.id, "pres-test-1");
  assertEquals(jsonOutput.type, "task");
});

Deno.test("CognitiveResource - Conversation Prompts Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "prompt-test-1",
    type: "article",
  });

  // Initially, no prompts
  let jsonOutput = resource.toJSON() as Record<string, any>;
  assertEquals(Object.hasOwn(jsonOutput, "prompts"), false, "prompts should not exist initially");
  assertEquals(resource.getPrompts().length, 0, "Initial prompts array should be empty");

  // Define prompts
  const prompt1: ConversationPrompt = {
    type: "follow-up",
    text: "Would you like to share this article?",
    priority: "medium",
  };
  const prompt2: ConversationPrompt = {
    type: "explanation",
    text: "This article requires editorial approval before publishing.",
    condition: "when status == 'submitted'",
  };

  // Add prompts
  resource.addPrompt(prompt1);
  resource.addPrompt(prompt2);

  // Verify retrieval
  const prompts = resource.getPrompts();
  assertEquals(prompts.length, 2);
  assertEquals(prompts[0], prompt1);
  assertEquals(prompts[1], prompt2);

  // Verify serialization
  jsonOutput = resource.toJSON() as Record<string, any>;
  assertExists(jsonOutput.prompts, "prompts should exist after adding prompts");
  assertEquals(jsonOutput.prompts.length, 2);
  assertEquals(jsonOutput.prompts[0], prompt1);
  assertEquals(jsonOutput.prompts[1], prompt2);

  // Verify other properties remain
  assertEquals(jsonOutput.id, "prompt-test-1");
  assertEquals(jsonOutput.type, "article");
}); 