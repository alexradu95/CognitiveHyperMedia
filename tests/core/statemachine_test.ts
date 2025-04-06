import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";
import { StateMachineDefinition, StateMachine } from "../../src/core/statemachine.ts";

// --- Test Setup: Define a sample state machine for a 'task' ---
const taskStateMachineDefinition: StateMachineDefinition = {
  initialState: "pending",
  states: {
    pending: {
      name: "pending",
      description: "Task is waiting to be started.",
      allowedActions: {
        start: { description: "Start working on the task." },
        cancel: { description: "Cancel the task." },
      },
      transitions: {
        start: { target: "inProgress" },
        cancel: { target: "cancelled" },
      },
    },
    inProgress: {
      name: "inProgress",
      description: "Task is actively being worked on.",
      allowedActions: {
        complete: { description: "Mark the task as complete." },
        block: { description: "Mark the task as blocked." },
      },
      transitions: {
        complete: { target: "completed" },
        block: { target: "blocked" },
      },
    },
    blocked: {
      name: "blocked",
      description: "Task is blocked and cannot proceed.",
      allowedActions: {
        unblock: { description: "Remove the block." },
        cancel: { description: "Cancel the blocked task." }, // Action allowed in multiple states
      },
      transitions: {
        unblock: { target: "inProgress" },
        cancel: { target: "cancelled" },
      },
    },
    completed: {
      name: "completed",
      description: "Task has been successfully completed.",
      allowedActions: {
        archive: { description: "Archive the completed task." },
      },
      transitions: {
        archive: { target: "archived" },
      },
    },
    cancelled: {
      name: "cancelled",
      description: "Task has been cancelled.",
      allowedActions: {}, // No actions allowed from cancelled state in this example
    },
    archived: {
      name: "archived",
      description: "Task has been archived.",
      allowedActions: {}, // No actions allowed from archived state
    },
  },
};
// --- End Test Setup ---

Deno.test("StateMachine - Initialization and Initial State", () => {
  const sm = new StateMachine(taskStateMachineDefinition);
  assertExists(sm, "State machine should be created");
  assertEquals(sm.getInitialState(), "pending", "Should return the correct initial state");
});

Deno.test("StateMachine - Get State Definition", () => {
  const sm = new StateMachine(taskStateMachineDefinition);
  const pendingState = sm.getStateDefinition("pending");
  assertExists(pendingState, "Should retrieve definition for 'pending' state");
  assertEquals(pendingState?.name, "pending");
  assertExists(pendingState?.allowedActions?.start, "'pending' state should allow 'start' action");

  const nonExistentState = sm.getStateDefinition("nonExistent");
  assertEquals(nonExistentState, undefined, "Should return undefined for non-existent state");
});

Deno.test("StateMachine - Get Allowed Actions for State", () => {
  const sm = new StateMachine(taskStateMachineDefinition);

  const pendingActions = sm.getAllowedActions("pending");
  assertExists(pendingActions.start, "'pending' should allow 'start'");
  assertExists(pendingActions.cancel, "'pending' should allow 'cancel'");
  assertEquals(Object.keys(pendingActions).length, 2, "Pending state should have 2 allowed actions");

  const completedActions = sm.getAllowedActions("completed");
  assertExists(completedActions.archive, "'completed' should allow 'archive'");
  assertEquals(Object.keys(completedActions).length, 1, "Completed state should have 1 allowed action");

  const cancelledActions = sm.getAllowedActions("cancelled");
  assertEquals(Object.keys(cancelledActions).length, 0, "Cancelled state should have 0 allowed actions");

  const nonExistentActions = sm.getAllowedActions("nonExistent");
  assertEquals(Object.keys(nonExistentActions).length, 0, "Non-existent state should return empty actions object");
});

Deno.test("StateMachine - Check if Action is Allowed", () => {
  const sm = new StateMachine(taskStateMachineDefinition);

  // Allowed actions
  assert(sm.isActionAllowed("pending", "start"), "'start' should be allowed in 'pending'");
  assert(sm.isActionAllowed("inProgress", "complete"), "'complete' should be allowed in 'inProgress'");
  assert(sm.isActionAllowed("blocked", "cancel"), "'cancel' should be allowed in 'blocked'");

  // Disallowed actions
  assert(!sm.isActionAllowed("pending", "complete"), "'complete' should NOT be allowed in 'pending'");
  assert(!sm.isActionAllowed("completed", "start"), "'start' should NOT be allowed in 'completed'");
  assert(!sm.isActionAllowed("cancelled", "archive"), "'archive' should NOT be allowed in 'cancelled'");
  assert(!sm.isActionAllowed("pending", "nonExistentAction"), "Non-existent action should not be allowed");
  assert(!sm.isActionAllowed("nonExistentState", "start"), "Action check on non-existent state should return false");
});

Deno.test("StateMachine - Get Target State for Transition", () => {
  const sm = new StateMachine(taskStateMachineDefinition);

  // Valid transitions
  assertEquals(sm.getTargetState("pending", "start"), "inProgress", "Transition 'pending' -> 'start' should target 'inProgress'");
  assertEquals(sm.getTargetState("inProgress", "complete"), "completed", "Transition 'inProgress' -> 'complete' should target 'completed'");
  assertEquals(sm.getTargetState("blocked", "unblock"), "inProgress", "Transition 'blocked' -> 'unblock' should target 'inProgress'");
  assertEquals(sm.getTargetState("blocked", "cancel"), "cancelled", "Transition 'blocked' -> 'cancel' should target 'cancelled'");

  // Actions without transitions defined
  assertEquals(sm.getTargetState("pending", "nonExistentAction"), undefined, "Should return undefined for action without transition");
  assertEquals(sm.getTargetState("completed", "start"), undefined, "Should return undefined for disallowed action"); // Even if allowed elsewhere

  // States without transitions defined
  assertEquals(sm.getTargetState("cancelled", "start"), undefined, "Should return undefined for actions from state with no transitions");
  assertEquals(sm.getTargetState("nonExistentState", "start"), undefined, "Should return undefined for non-existent state");
}); 