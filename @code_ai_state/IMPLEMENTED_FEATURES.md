# ✅ Implemented Features

1.  **`CognitiveStore` Core:**
    *   CRUD operations (`create`, `get`, `update`, `delete`) interacting with Deno KV.
    *   Collection retrieval (`getCollection`) with basic filtering (equality) and pagination.
    *   Action execution (`performAction`) handling default `update`/`delete` actions and basic custom action flow.
2.  **`CognitiveResource` Structure:**
    *   Basic properties storage.
    *   Action definitions (`Action` interface).
    *   HATEOAS Links (`Link` interface, `addLink`, `getLinks`, `getLink`, automatic `self` link).
    *   Presentation Hints (`PresentationHints`, `setPresentation`).
    *   Conversation Prompts (`ConversationPrompt`, `addPrompt`, `getPrompts`).
    *   `toJSON()` serialization (outputting keys without internal underscores).
3.  **`CognitiveCollection` Structure:**
    *   Holds items, item type, pagination info, applied filters.
    *   Basic collection-level actions (`create`, `filter`).
    *   `toJSON()` serialization.
4.  **`StateMachine`:**
    *   Definition (`StateDefinition`, `TransitionDefinition`, `StateMachineDefinition`).
    *   Core logic (`StateMachine` class: `getInitialState`, `getStateDefinition`, `isActionAllowed`, `getTargetState`, `getAllowedActions`).
5.  **State Machine Integration:**
    *   `CognitiveStore.registerStateMachine`.
    *   `create`: Sets initial resource `status` based on registered SM.
    *   `enhanceResource`: Adds state info (`_stateName`, `_stateDescription`), state-specific actions, presentation hints, and prompts based on current `status`.
    *   `performAction`: Checks if an action is allowed in the current state (temporary bypass for update/delete) and updates the `status` property upon successful transition.
6.  **Resource Enhancement (`enhanceResource`):**
    *   Adds default actions (`update`, `delete`) if not overridden by state.
    *   Adds state-based info/actions/hints/prompts (using 'task' example).
    *   Adds relationship links based on `*Id` property naming convention.
7.  **`McpBridge`:**
    *   Factory `createMcpBridge` taking `CognitiveStore`.
    *   Simplified MCP command/response types.
    *   Implemented handlers (`handleExplore`, `handleAct`, `handleCreate`) translating between MCP concepts and Store methods.
    *   Basic URI parsing and error mapping to HTTP status codes (400, 404, 403, 200, 201, 204, 500).
8.  **Basic HTTP Server (`src/main.ts`):**
    *   Uses `Deno.serve` to listen for requests.
    *   Initializes Store and Bridge, registers sample state machine.
    *   Routes requests based on HTTP Method and Path (`GET /type/id`, `GET /type`, `POST /type`, `POST /type/id/action`) to appropriate bridge handlers.
    *   Parses JSON request bodies for `POST`.
    *   Constructs JSON `Response` objects based on `McpResponse`.
9.  **Testing:**
    *   Unit tests for `CognitiveStore` covering CRUD, collections, state integration, enhancements.
    *   Unit tests for `StateMachine`.
    *   Unit tests for `McpBridge` handlers covering success and error cases.
10. **Strict State Action Checking:**
    *   `performAction` now strictly enforces that an action (including `update`/`delete`) must be present in the current state's `allowedActions` if a state machine is registered. 