// src/core/statemachine.ts

import { Action } from "./resource.ts"; // Reuse Action definition if applicable

/**
 * 📚 Defines a transition to a target state triggered by an action.
 */
export interface TransitionDefinition {
  /** The target state name after the action is performed. */
  target: string;
  /** Description of the transition effect */
  description?: string;
  /** Optional guard condition that must be true for the transition */
  guard?: (context: unknown) => boolean;
  /** Optional effect function executed during transition */
  effect?: (context: unknown) => void | Promise<void>;
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
  /** Optional function called when entering this state */
  onEnter?: (context: unknown) => void | Promise<void>;
  /** Optional function called when exiting this state */
  onExit?: (context: unknown) => void | Promise<void>;
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
 * Interface representing a transition between states.
 */
export interface Transition {
  target: string;
  description?: string;
}

/**
 * ✨ Manages the states and transitions for a specific resource type based on a definition.
 */
export class StateMachine {
  #definition: StateMachineDefinition;

  /**
   * ⚙️ Creates a new StateMachine instance.
   * @param definition - The definition describing the states and transitions.
   */
  constructor(definition: StateMachineDefinition) {
    // TODO: Add validation for the definition (e.g., initial state exists, transitions point to valid states)
    this.#definition = definition;
  }

  /**
   * 🏁 Gets the name of the initial state defined for this machine.
   * @returns The initial state name.
   */
  getInitialState(): string {
    return this.#definition.initialState;
  }

  /**
   * 🔍 Gets the definition of a specific state.
   * @param stateName - The name of the state.
   * @returns The StateDefinition, or undefined if the state doesn't exist.
   */
  getStateDefinition(stateName: string): StateDefinition | undefined {
    return this.#definition.states[stateName];
  }

  /**
   * ✅ Checks if an action is explicitly allowed in the given state.
   * Note: This only checks the `allowedActions` for the state, not default actions like update/delete unless explicitly added.
   * @param stateName - The name of the current state.
   * @param actionName - The name of the action to check.
   * @returns True if the action is allowed, false otherwise.
   */
  isActionAllowed(stateName: string, actionName: string): boolean {
    return Boolean(this.getStateDefinition(stateName)?.allowedActions[actionName]);
  }

  /**
   * 🤔 Determines if performing an action from a given state triggers a transition.
   * @param stateName - The name of the current state.
   * @param actionName - The name of the action being performed.
   * @returns The target state name if a transition occurs, otherwise undefined.
   */
  getTargetState(stateName: string, actionName: string): string | undefined {
    return this.getStateDefinition(stateName)?.transitions?.[actionName]?.target;
  }

  /**
   * 🧩 Gets all explicitly allowed actions for a given state.
   * @param stateName - The name of the state.
   * @returns A record mapping action names to their definitions for the specified state, or an empty object if the state is not found.
   */
  getAllowedActions(stateName: string): Record<string, Action> {
    return this.getStateDefinition(stateName)?.allowedActions ?? {};
  }

  /**
   * 📝 Gets the description of a state
   * @param stateName - The name of the state
   * @returns The description of the state, or undefined if none exists
   */
  getStateDescription(stateName: string): string | undefined {
    return this.getStateDefinition(stateName)?.description;
  }

  /**
   * 📝 Gets the description of a transition
   * @param stateName - The current state name
   * @param actionName - The action name
   * @returns The description of the transition, or undefined if none exists
   */
  getTransitionDescription(stateName: string, actionName: string): string | undefined {
    return this.getStateDefinition(stateName)?.transitions?.[actionName]?.description;
  }

  /**
   * 🧪 Checks if a transition from one state to another is valid
   * @param fromState - The starting state
   * @param toState - The target state
   * @returns True if any action can transition from fromState to toState
   */
  canTransition(fromState: string, toState: string): boolean {
    const stateDef = this.getStateDefinition(fromState);
    if (!stateDef?.transitions) return false;
    
    return Object.values(stateDef.transitions)
      .some(transition => transition.target === toState);
  }

  /**
   * ✨ Gets all allowed transitions from a specific state
   * 
   * @param state - The current state
   * @returns Array of transition objects
   */
  getTransitionsFrom(state: string): Transition[] {
    const stateDefinition = this.getStateDefinition(state);
    if (!stateDefinition || !stateDefinition.transitions) {
      return [];
    }

    const transitions: Transition[] = [];
    
    // Convert transitions map to array of Transition objects
    for (const [actionName, transition] of Object.entries(stateDefinition.transitions)) {
      transitions.push({
        target: transition.target,
        description: transition.description
      });
    }
    
    return transitions;
  }
}

/**
 * 🏗️ Builder for creating StateMachine instances with a fluent API
 */
export class StateMachineBuilder {
  #initialState = '';
  #states: Record<string, StateDefinition> = {};

  /**
   * 🏁 Sets the initial state of the state machine
   */
  initialState(name: string): StateMachineBuilder {
    this.#initialState = name;
    return this;
  }

  /**
   * ➕ Adds a state to the state machine
   */
  addState(state: StateDefinition): StateMachineBuilder {
    this.#states[state.name] = state;
    return this;
  }

  /**
   * ➕ Adds a state with the given name and properties
   */
  state(name: string, {
    description,
    allowedActions = {},
    transitions = {},
    onEnter,
    onExit
  }: Partial<Omit<StateDefinition, 'name'>> = {}): StateMachineBuilder {
    this.#states[name] = {
      name,
      description,
      allowedActions,
      transitions,
      onEnter,
      onExit
    };
    return this;
  }

  /**
   * ➡️ Adds a transition between states
   */
  transition(
    fromState: string,
    actionName: string,
    toState: string,
    options: Partial<Omit<TransitionDefinition, 'target'>> = {}
  ): StateMachineBuilder {
    // Create the from state if it doesn't exist
    if (!this.#states[fromState]) {
      this.state(fromState);
    }

    // Ensure transitions map exists
    this.#states[fromState].transitions ??= {};
    
    // Add the transition
    this.#states[fromState].transitions![actionName] = {
      target: toState,
      ...options
    };
    
    return this;
  }

  /**
   * 🔨 Builds and returns the StateMachine instance
   */
  build(): StateMachine {
    if (!this.#initialState) {
      throw new Error('Initial state must be set');
    }
    
    if (Object.keys(this.#states).length === 0) {
      throw new Error('At least one state must be defined');
    }
    
    if (!this.#states[this.#initialState]) {
      throw new Error(`Initial state "${this.#initialState}" is not defined`);
    }
    
    return new StateMachine({
      initialState: this.#initialState,
      states: { ...this.#states }
    });
  }
} 