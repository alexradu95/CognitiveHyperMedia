// src/core/statemachine.ts

import { Action } from "./resource.ts"; // Reuse Action definition if applicable

/**
 * 📚 Defines a transition to a target state triggered by an action.
 */
export interface TransitionDefinition {
  /** The target state name after the action is performed. */
  target: string;
  // TODO: Add guards/conditions for the transition later?
  // TODO: Add effects/callbacks executed during transition later?
}

/**
 * 📚 Defines a single state within the state machine.
 */
export interface StateDefinition {
  /** The unique name identifying this state. */
  name: string;
  /** A description of the state's purpose. */
  description?: string;
  /** Actions explicitly allowed when the resource is in this state. */
  allowedActions: Record<string, Action>; // Map action name to its definition
  /** Transitions triggered by actions from this state. */
  transitions?: Record<string, TransitionDefinition>; // Map action name to transition
}

/**
 * ⚙️ Defines the overall structure and behavior of a state machine for a resource type.
 */
export interface StateMachineDefinition {
  /** The name of the initial state when a resource is created. */
  initialState: string;
  /** A map of state names to their detailed definitions. */
  states: Record<string, StateDefinition>;
}

/**
 * ✨ Manages the states and transitions for a specific resource type based on a definition.
 */
export class StateMachine {
  private definition: StateMachineDefinition;

  /**
   * ⚙️ Creates a new StateMachine instance.
   * @param definition - The definition describing the states and transitions.
   */
  constructor(definition: StateMachineDefinition) {
    // TODO: Add validation for the definition (e.g., initial state exists, transitions point to valid states)
    this.definition = definition;
  }

  /**
   * 🏁 Gets the name of the initial state defined for this machine.
   * @returns The initial state name.
   */
  getInitialState(): string {
    return this.definition.initialState;
  }

  /**
   * 🔍 Gets the definition of a specific state.
   * @param stateName - The name of the state.
   * @returns The StateDefinition, or undefined if the state doesn't exist.
   */
  getStateDefinition(stateName: string): StateDefinition | undefined {
    return this.definition.states[stateName];
  }

  /**
   * ✅ Checks if an action is explicitly allowed in the given state.
   * Note: This only checks the `allowedActions` for the state, not default actions like update/delete unless explicitly added.
   * @param stateName - The name of the current state.
   * @param actionName - The name of the action to check.
   * @returns True if the action is allowed, false otherwise.
   */
  isActionAllowed(stateName: string, actionName: string): boolean {
    const stateDef = this.getStateDefinition(stateName);
    return !!stateDef?.allowedActions[actionName];
  }

  /**
   * 🤔 Determines if performing an action from a given state triggers a transition.
   * @param stateName - The name of the current state.
   * @param actionName - The name of the action being performed.
   * @returns The target state name if a transition occurs, otherwise undefined.
   */
  getTargetState(stateName: string, actionName: string): string | undefined {
    const stateDef = this.getStateDefinition(stateName);
    return stateDef?.transitions?.[actionName]?.target;
  }

  /**
   * 🧩 Gets all explicitly allowed actions for a given state.
   * @param stateName - The name of the state.
   * @returns A record mapping action names to their definitions for the specified state, or an empty object if the state is not found.
   */
  getAllowedActions(stateName: string): Record<string, Action> {
    const stateDef = this.getStateDefinition(stateName);
    return stateDef?.allowedActions ?? {};
  }
} 