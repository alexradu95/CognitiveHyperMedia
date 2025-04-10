# 📝 TODO Next

## Immediate Tasks to Implement

1. Custom action logic: Add ability to register custom logic for actions beyond state transitions
2. Configuration / schema loading: Allow loading resource type definitions from config/schema files
3. Multi-modal extensions: Add support for images and other media types in resources
4. Advanced state machine capabilities: Implement parallel states and hierarchical state machines
5. Adaptive representation: Dynamic resource representation based on context

## Recently Completed

1. ✅ Refactor protocol implementation: Move MCP protocol from infrastructure to adapters folder
2. ✅ Make `CognitiveResource.toJSON()` include relationships in serialized output
3. ✅ Implementation of logging and debugging infrastructure
4. ✅ Basic conversation prompt system for natural dialogue guidance

## Next Refactorings

1. Refactor URI parsing to be more robust (currently handled directly in protocol adapters)
2. Refactor state machine registration to use a factory pattern
3. Add more extensive error handling with custom error types
4. Implement standardized error format from white paper

# ⏳ To Implement Next (Immediate)

1. **Implement Custom Action Logic:** The `default` case in `performAction` currently only handles state transitions. Add capability to execute specific logic for custom actions defined in state machines (this likely requires a way to register action handlers/functions).

2. **Configuration/Schema Loading:** Move `StateMachineDefinition`s and potentially relationship rules/presentation hints/prompts out of code into configuration files (e.g., JSON, YAML) loaded at startup.

3. **Refine Error Representation:** Implement the standardized error format from the white paper, including:
   - Error code and message
   - Detailed information about what went wrong
   - Recovery action suggestions
   - Conversation prompts for error handling

4. **Advanced Collection Features:** Enhance collection implementation with:
   - Richer aggregation capabilities
   - Improved filtering and sorting
   - Collection-level state machines
   - More sophisticated presentation guidance

5. **Conversation Guidance Enhancements:** Improve the prompt system with:
   - Conditional prompts based on resource state
   - Priority levels for prompts
   - More sophisticated prompt types (follow-up, confirmation, explanation, suggestion)
   - Context-aware prompt selection

6. **Multi-Modal Support:** Implement the multi-modal extensions outlined in the white paper:
   - Image integration with presentation hints
   - Audio/video resource support
   - Structured media property definitions
   - Media-specific presentation guidance

7. **Collaborative Features:** Begin implementing collaborative cognition support:
   - User presence tracking
   - Collaborative action coordination
   - Shared state management
   - Role-based permissions for actions

# 🔮 Future Work

1. **Adaptive Resource Representation:** Implement dynamic resource representations that adapt based on:
   - Conversation context
   - User expertise level
   - Device capabilities
   - Accessibility requirements

2. **Advanced State Machine Features:**
   - Parallel states (resources with multiple simultaneous state dimensions)
   - Hierarchical state machines (nested states)
   - Guard conditions for state transitions
   - History states for returning to previous states
   - Event-driven transitions

3. **Search and Discovery:**
   - Implement the `search` tool from the white paper
   - Add semantic search capabilities
   - Provide faceted navigation for collections
   - Implement relevance ranking

4. **Integration with More Protocols:**
   - OpenAI protocol adapter
   - Anthropic protocol adapter
   - Custom protocol bridges for specific platforms

5. **Performance Optimizations:**
   - Response caching
   - Partial resource updates
   - Bulk operations for collections
   - Efficient pagination for large collections

## Storage

- [ ] Add IndexedDB adapter for browser environments
- [ ] Add support for atomic transactions in Deno KV storage
- [ ] Implement optimistic locking for concurrent updates