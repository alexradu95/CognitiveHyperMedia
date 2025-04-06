# ⏳ To Implement Next (Immediate)

1.  **Implement Custom Action Logic:** The `default` case in `performAction` currently only handles state transitions. Add capability to execute specific logic for custom actions defined in state machines (this likely requires a way to register action handlers/functions).
2.  **Configuration/Schema Loading:** Move `StateMachineDefinition`s and potentially relationship rules/presentation hints/prompts out of code into configuration files (e.g., JSON, YAML) loaded at startup.
3.  **Refine MCP Bridge Error Handling:** Use specific custom error types (e.g., `ResourceNotFoundError`, `ValidationError`, `ActionNotAllowedError`) thrown by the store/state machine and map them more accurately to MCP error responses/HTTP statuses in the bridge.