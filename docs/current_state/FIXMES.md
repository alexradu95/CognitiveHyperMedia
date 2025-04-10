# 🔧 Need to Fix

1.  **PowerShell `curl` Syntax:** The standard `curl` command provided for testing needs adjustment for PowerShell's `Invoke-WebRequest` alias. The `-H` parameter requires a hashtable (`@{'Header'='Value'}`) and `-d` becomes `-Body`. 

# 🚨 FIXMEs and Known Issues

## Core Resource Model

1. **Resource Inheritance:** The current implementation doesn't fully support resource inheritance as described in the white paper. Need to implement proper parent-child relationships between resource types.

2. **Inconsistent Naming:** There's inconsistency between some property names in code vs. the white paper specification. For example, the white paper uses `_relationships` but code might use other naming.

3. **Incomplete Action Parameters:** The current action parameters implementation doesn't support all features described in the white paper (validation, options, defaults).

4. **Error Format Mismatch:** Current error handling doesn't match the standardized error format defined in the white paper section 4.8.

## Protocol Implementation

1. **Incomplete MCP Tools:** Not all MCP tools described in the white paper (section 5) are implemented. Missing search, aggregate, and other extended tools.

2. **Tool Parameter Validation:** Current implementation needs better validation of tool parameters against schema definitions.

3. **Response Format Inconsistency:** Response formats from protocol adapters need to be standardized according to the white paper specification.

## State Machine

1. **Simple State Machine:** Current state machine implementation is simpler than what's described in the white paper. Need to add support for advanced features like parallel states, guard conditions, and history states.

2. **Missing Transition Metadata:** Transitions lack metadata like descriptions and effects that should be included in resource representations.

## Testing and Documentation

1. **Test Coverage Gaps:** Test coverage is incomplete, especially for new components described in the white paper.

2. **Documentation Inconsistency:** Documentation should be updated to reflect the terminology and concepts from the white paper consistently.

3. **Example Implementations:** Need to create example implementations of the use cases described in the white paper (task management, e-commerce).

## Performance and Optimization

1. **Context Optimization:** Need to implement the context optimization strategies described in section 3.3 of the white paper.

2. **Inefficient Serialization:** Current serialization of resources and collections may not be optimized for LLM context windows as described in the white paper.

## Integration and Extensions

1. **Missing Multi-Modal Support:** No implementation yet for the multi-modal extensions described in section 9.1 of the white paper.

2. **Collaborative Features:** Need to implement the collaborative cognition features outlined in section 9.4.

## Storage

- ✅ Simplified storage architecture by consolidating into a single file implementation
- [ ] Fix potential race condition in list operation when items are added/removed during pagination
- [ ] Improve error handling for storage operations with more specific error types 