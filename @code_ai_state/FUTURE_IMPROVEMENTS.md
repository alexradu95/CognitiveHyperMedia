# 🚀 Future Improvements

1.  **Advanced Collection Queries:** Implement more complex filtering (operators like `gt`, `lt`, `contains`, `startsWith`), sorting (by arbitrary fields), and potentially field selection in `getCollection` and expose via MCP bridge query parameters.
2.  **Schema Validation:** Implement schema definitions for resource types (e.g., using Zod) and validate payloads in `create`/`update`/`performAction`.
3.  **Sophisticated Enhancement:** Drive resource enhancement (links, hints, prompts) from schemas/configuration rather than hardcoded logic or simple conventions.
4.  **Real MCP Integration:** Replace simplified MCP types/flow with actual MCP SDK integration if targeting MCP compatibility specifically.
5.  **Authentication/Authorization:** Add a layer to control access to resources and actions.
6.  **Real-time Updates:** Explore WebSockets or Server-Sent Events (SSE) for pushing updates to clients.
7.  **Hypermedia Controls:** Ensure `Link` and `Action` definitions fully align with chosen hypermedia formats (like HAL, Siren, Collection+JSON).
8.  **Deployment:** Containerization, configuration management for deployment. 
9. Create a separation layer for store agnosticism so that we can easily replace the store on demand without too much hassle.