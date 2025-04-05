import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CognitiveResource, Action, ParameterDefinition, ResourceState, Relationship, PresentationHints, ConversationPrompt } from "../../src/core/resource.ts"; // Corrected path

Deno.test("CognitiveResource - Creation and Basic Serialization", () => {
  const resource = new CognitiveResource({
    id: "test-id-123",
    type: "test-type",
  });

  assertExists(resource);
  assertEquals(resource.getId(), "test-id-123");
  assertEquals(resource.getType(), "test-type");

  const jsonOutput = resource.toJSON();
  assertEquals(jsonOutput, {
    _id: "test-id-123",
    _type: "test-type",
  });
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

  const jsonOutput = resource.toJSON();
  assertEquals(jsonOutput, {
    _id: "prop-test-456",
    _type: "widget",
    name: "Test Widget",
    color: "red",
    count: 42,
    newProp: true,
  });
});

Deno.test("CognitiveResource - Actions Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "action-test-789",
    type: "document",
  });

  // Initially, no actions should be present
  let jsonOutput = resource.toJSON();
  assertEquals(Object.hasOwn(jsonOutput, "_actions"), false, "_actions should not exist when empty");
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
  jsonOutput = resource.toJSON();
  assertExists(jsonOutput._actions, "_actions should exist after adding actions");
  assertEquals(jsonOutput._actions, {
    submit: submitAction,
    publish: publishAction,
  });

  // Verify original properties are still there
  assertEquals(jsonOutput._id, "action-test-789");
  assertEquals(jsonOutput._type, "document");
});

Deno.test("CognitiveResource - State Management and Serialization", () => {
  // Resource without initial state
  const resource1 = new CognitiveResource({
    id: "state-test-1",
    type: "ticket",
  });

  let jsonOutput1 = resource1.toJSON();
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
  jsonOutput1 = resource1.toJSON();
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
  jsonOutput1 = resource1.toJSON();
  assertEquals(jsonOutput1._state, complexState);

  // Verify other properties are still intact
  assertEquals(jsonOutput1._id, "state-test-1");
  assertEquals(jsonOutput1._type, "ticket");
});

Deno.test("CognitiveResource - Relationships Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "rel-test-1",
    type: "project",
  });

  // Initially, no relationships
  let jsonOutput = resource.toJSON();
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
  jsonOutput = resource.toJSON();
  assertExists(jsonOutput._relationships, "_relationships should exist after adding relationships");
  assertEquals(jsonOutput._relationships, {
    owner: ownerRel,
    tasks: tasksRel,
  });

  // Verify other properties remain
  assertEquals(jsonOutput._id, "rel-test-1");
  assertEquals(jsonOutput._type, "project");
  assertEquals(Object.hasOwn(jsonOutput, "_state"), false);
});

Deno.test("CognitiveResource - Presentation Hints Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "pres-test-1",
    type: "task",
  });

  // Initially, no presentation hints
  let jsonOutput = resource.toJSON();
  assertEquals(Object.hasOwn(jsonOutput, "_presentation"), false, "_presentation should not exist initially");

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
  jsonOutput = resource.toJSON();
  assertExists(jsonOutput._presentation, "_presentation should exist after setting hints");
  assertEquals(jsonOutput._presentation, hints);

  // Verify merging/updating hints (optional - could add separate test later)
  resource.setPresentation({ color: "blue", icon: "task-done" }); // Update some hints
  jsonOutput = resource.toJSON();
  const updatedHints = jsonOutput._presentation as PresentationHints;
  assertEquals(updatedHints.color, "blue");
  assertEquals(updatedHints.icon, "task-done");
  assertEquals(updatedHints.priority, "high", "Original hints should persist if not overwritten");
  assertEquals(updatedHints.visualization, "card", "Original hints should persist if not overwritten");

  // Verify other properties remain
  assertEquals(jsonOutput._id, "pres-test-1");
  assertEquals(jsonOutput._type, "task");
  assertEquals(Object.hasOwn(jsonOutput, "_state"), false);
  assertEquals(Object.hasOwn(jsonOutput, "_actions"), false);
});

Deno.test("CognitiveResource - Conversation Prompts Management and Serialization", () => {
  const resource = new CognitiveResource({
    id: "prompt-test-1",
    type: "meeting",
  });

  // Initially, no prompts
  let jsonOutput = resource.toJSON();
  assertEquals(Object.hasOwn(jsonOutput, "_prompts"), false, "_prompts should not exist initially");
  assertEquals(resource.getPrompts().length, 0);

  // Define prompts
  const prompt1: ConversationPrompt = {
    type: "follow-up",
    text: "Would you like to see the agenda?",
    priority: "medium",
  };
  const prompt2: ConversationPrompt = {
    type: "suggestion",
    text: "I can show you who is attending.",
    condition: "attendeeCount > 0",
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
  jsonOutput = resource.toJSON();
  assertExists(jsonOutput._prompts, "_prompts should exist after adding prompts");
  assertEquals(jsonOutput._prompts, [prompt1, prompt2]);

  // Verify other properties remain
  assertEquals(jsonOutput._id, "prompt-test-1");
  assertEquals(jsonOutput._type, "meeting");
  assertEquals(Object.hasOwn(jsonOutput, "_actions"), false);
  assertEquals(Object.hasOwn(jsonOutput, "_state"), false);
}); 