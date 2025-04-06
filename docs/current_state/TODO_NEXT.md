# ⏳ To Implement Next (Immediate)

1.  **Implement Custom Action Logic:** The `default` case in `performAction` currently only handles state transitions. Add capability to execute specific logic for custom actions defined in state machines (this likely requires a way to register action handlers/functions).
2.  **Configuration/Schema Loading:** Move `StateMachineDefinition`s and potentially relationship rules/presentation hints/prompts out of code into configuration files (e.g., JSON, YAML) loaded at startup.
3.  **Refine Error Handling:** Improve the error handling in protocol adapters by using specific custom error types (e.g., `ResourceNotFoundError`, `ValidationError`, `ActionNotAllowedError`) and mapping them more accurately to protocol-specific responses.
4.  **Implement Additional Protocol Adapters:** Create adapters for other AI protocol standards (e.g., OpenAI, Anthropic, etc.) following the adapter pattern we've established.
5.  **Transport Layer Abstraction:** Now that protocol implementations are properly separated in the adapters folder, implement a transport layer abstraction to allow connecting to different protocols through different communication methods (HTTP, WebSockets, stdio) without changing the protocol adapters.
6.  **Runtime Protocol Selection:** Implement a mechanism to select or switch between different protocol adapters at runtime based on configuration or request headers.

# ✅ Recently Completed

1. **Protocol Refactoring:** Moved protocol implementation from `infrastracture` to `adapters` folder to better separate concerns and maintain library agnostic code in the infrastructure layer.