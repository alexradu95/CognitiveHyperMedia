/**
 * ⚙️ Task state machine definition for the todo app.
 */
import { StateMachineDefinition } from "../../../mod.ts";

/**
 * 🧩 State machine definition for tasks in the todo app.
 * 
 * @returns The state machine definition object for tasks
 */
export const taskStateMachineDefinition: StateMachineDefinition = {
  initialState: "pending",
  states: {
    pending: { 
      name: "pending", 
      description: "Task is waiting.", 
      allowedActions: { 
        start: {description: "Start"}, 
        cancel: {description: "Cancel"} 
      }, 
      transitions: { 
        start: { target: "inProgress" }, 
        cancel: { target: "cancelled" } 
      } 
    },
    inProgress: { 
      name: "inProgress", 
      description: "Task is active.", 
      allowedActions: { 
        complete: {description: "Complete"}, 
        block: {description: "Block"} 
      }, 
      transitions: { 
        complete: { target: "completed" }, 
        block: { target: "blocked" } 
      } 
    },
    blocked: { 
      name: "blocked", 
      description: "Task is blocked.", 
      allowedActions: { 
        unblock: {description: "Unblock"}, 
        cancel: {description: "Cancel"} 
      }, 
      transitions: { 
        unblock: { target: "inProgress" }, 
        cancel: { target: "cancelled" } 
      } 
    },
    completed: { 
      name: "completed", 
      description: "Task is done.", 
      allowedActions: { 
        archive: {description: "Archive"} 
      }, 
      transitions: { 
        archive: { target: "archived" } 
      } 
    },
    cancelled: { 
      name: "cancelled", 
      description: "Task cancelled.", 
      allowedActions: {} 
    },
    archived: { 
      name: "archived", 
      description: "Task archived.", 
      allowedActions: {} 
    },
  },
}; 