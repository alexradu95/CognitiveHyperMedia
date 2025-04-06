# 📝 TODO Next

## Immediate Tasks to Implement

1. Custom action logic: Add ability to register custom logic for actions beyond state transitions
2. Configuration / schema loading: Allow loading resource type definitions from config/schema files
3. Refine error handling: Improve error responses to be more informative and protocol-compliant
4. Additional protocol adapters: Implement adapters for other protocols (OpenAI, Anthropic Claude)

## Recently Completed

1. ✅ Refactor protocol implementation: Move MCP protocol from infrastructure to adapters folder
2. ✅ Make `CognitiveResource.toJSON()` include relationships in serialized output
3. ✅ Fix store tests to run with --unstable-kv flag (required for Deno KV)
4. ✅ Protocol Bridge tests: Ensure refactored protocol implementation works correctly

## Next Refactorings

1. Refactor URI parsing to be more robust (currently handled directly in protocol adapters)
2. Refactor state machine registration to use a factory pattern
3. Add more extensive error handling with custom error types

# ⏳ To Implement Next (Immediate)

1.  **Implement Custom Action Logic:** The `default` case in `performAction` currently only handles state transitions. Add capability to execute specific logic for custom actions defined in state machines (this likely requires a way to register action handlers/functions).
2.  **Configuration/Schema Loading:** Move `StateMachineDefinition`s and potentially relationship rules/presentation hints/prompts out of code into configuration files (e.g., JSON, YAML) loaded at startup.
3.  **Refine Error Handling:** Improve the error handling in protocol adapters by using specific custom error types (e.g., `ResourceNotFoundError`, `ValidationError`, `ActionNotAllowedError`) and mapping them more accurately to protocol-specific responses.
4.  **Implement Additional Protocol Adapters:** Create adapters for other AI protocol standards (e.g., OpenAI, Anthropic, etc.) following the adapter pattern we've established.
5.  **Transport Layer Abstraction:** Now that protocol implementations are properly separated in the adapters folder, implement a transport layer abstraction to allow connecting to different protocols through different communication methods (HTTP, WebSockets, stdio) without changing the protocol adapters.
6.  **Runtime Protocol Selection:** Implement a mechanism to select or switch between different protocol adapters at runtime based on configuration or request headers.