# 🧪 Test Coverage Gaps & Edge Cases

This list outlines potential edge cases and scenarios not explicitly covered by the current test suites (`tests/store/store_test.ts`, `tests/mcp/bridge_test.ts`).

## Store (`tests/store/store_test.ts`)

*   **`create`:**
    *   Creating with an explicit `id` that already exists for the same type.
    *   Providing non-object data as the creation payload.
*   **`update`:**
    *   Explicitly asserting that attempts to update immutable properties (`id`, `createdAt`) are ignored.
    *   Updating with incompatible data types for existing fields.
*   **`getCollection`:**
    *   Filtering by system properties (`id`, `createdAt`, `updatedAt`, `status`).
    *   Filtering on non-existent properties.
    *   Filtering on non-string values (numbers, booleans).
    *   Filtering that yields zero results.
    *   Pagination with `page=1` when `totalItems=0`.
    *   Pagination with `pageSize` equal to or greater than `totalItems`.
    *   Invalid pagination parameters (`page=0`, `pageSize=0`, negative values, non-numeric strings).
    *   Combining filtering and pagination where the filtered set interacts differently with page boundaries.
*   **`performAction`:**
    *   Action requiring payload receives an empty object `{}` payload (Covered by test, but verify `performAction` logic robustness beyond `update`).
    *   Action *not* requiring payload receives a payload.
    *   Allowed action defined in SM has no corresponding transition defined.
    *   `update` action via `performAction` where the payload also contains `status`.
*   **General:**
    *   Case sensitivity for resource types (e.g., `/Task` vs `/task`).
    *   Concurrency (difficult to reliably automate without specific infra).

## Bridge (`tests/mcp/bridge_test.ts`)

*   **`handleCreate`:**
    *   Request with invalid JSON syntax in the body.
    *   Request with non-JSON body but `Content-Type: application/json` header.
    *   URI case sensitivity.
*   **`handleExplore`:**
    *   More URI format variations (`//type`, `/type/`, `/type//id`, `/type/id/`).
    *   Invalid numeric values for `page`/`pageSize` query params (0, negative, non-integer, strings).
    *   URL-encoded characters in path segments or query parameters.
    *   Requesting a collection for a type with zero items.
*   **`handleAct`:**
    *   Request payload with invalid JSON syntax.
    *   Action name or URI segments with URL-encoded characters.
    *   Case sensitivity of action names in the URI (`/task/id/Start`).
    *   Case sensitivity of type/id in the URI.
    *   Explicitly testing non-4xx errors from `performAction` result in a 500 response. 