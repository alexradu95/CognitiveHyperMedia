// Import from the framework
import { 
  DenoKvAdapter,
  StateMachineDefinition, 
  createBridge,
  CognitiveStore
} from "../../mod.ts";

// Add Protocol related imports
import { ProtocolFactory } from "../../src/adapters/protocol/protocol_factory.ts";

// Add MCP SDK imports
import { McpServer, ResourceTemplate } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Redirect stdout to stderr for third-party libraries
// This prevents any text from interfering with MCP protocol messages
const originalConsoleLog = console.log;
console.log = (...args) => console.error(...args);

// Todo App specific state machine definition
const taskStateMachineDefinition: StateMachineDefinition = {
  initialState: "pending",
  states: {
    pending: { name: "pending", description: "Task is waiting.", allowedActions: { start: {description: "Start"}, cancel: {description: "Cancel"} }, transitions: { start: { target: "inProgress" }, cancel: { target: "cancelled" } } },
    inProgress: { name: "inProgress", description: "Task is active.", allowedActions: { complete: {description: "Complete"}, block: {description: "Block"} }, transitions: { complete: { target: "completed" }, block: { target: "blocked" } } },
    blocked: { name: "blocked", description: "Task is blocked.", allowedActions: { unblock: {description: "Unblock"}, cancel: {description: "Cancel"} }, transitions: { unblock: { target: "inProgress" }, cancel: { target: "cancelled" } } },
    completed: { name: "completed", description: "Task is done.", allowedActions: { archive: {description: "Archive"} }, transitions: { archive: { target: "archived" } } },
    cancelled: { name: "cancelled", description: "Task cancelled.", allowedActions: {} },
    archived: { name: "archived", description: "Task archived.", allowedActions: {} },
  },
};

async function setupMcpServer(store: CognitiveStore) {
  // Create an MCP server
  const server = new McpServer({
    name: "Todo App",
    version: "1.0.0"
  });

  // List tasks resource
  server.resource(
    "tasks",
    "tasks://list",
    async (uri: URL) => {
      const tasks = await store.getCollection("task");
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(tasks, null, 2)
        }]
      };
    }
  );

  // Get task by ID - Fix the ResourceTemplate syntax
  const taskTemplate = new ResourceTemplate("task://{id}", { list: undefined });
  server.resource(
    "task",
    taskTemplate,
    async (uri: URL, variables) => {
      // Ensure we have a string ID by converting if needed
      const taskId = String(variables.id);
      const task = await store.get("task", taskId);
      return {
        contents: [{
          uri: uri.href,
          text: task ? JSON.stringify(task, null, 2) : "Task not found"
        }]
      };
    }
  );

  // Create task tool
  server.tool(
    "create-task",
    { title: z.string(), description: z.string().optional() },
    async ({ title, description }: { title: string, description?: string }) => {
      const newTask = {
        title,
        description: description || "",
        status: "pending", 
        createdAt: new Date().toISOString()
      };
      
      const id = await store.create("task", newTask);
      
      // Ensure the ID is a string
      const taskId = typeof id === 'object' ? JSON.stringify(id) : String(id);
      
      return {
        content: [{ 
          type: "text", 
          text: `Task created with ID: ${taskId}` 
        }]
      };
    }
  );

  // Transition task state tool
  server.tool(
    "transition-task",
    { 
      id: z.string(), 
      action: z.string()
    },
    async ({ id, action }: { id: string, action: string }) => {
      try {
        const result = await store.performAction("task", id, action);
        return {
          content: [{ 
            type: "text", 
            text: `Task ${id} transitioned with action: ${action}. New state: ${result?.getProperty("status") || "unknown"}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: Delete task
  server.tool(
    "delete-task",
    { id: z.string() },
    async ({ id }) => {
      try {
        await store.delete("task", id);
        return {
          content: [{ 
            type: "text", 
            text: `Task ${id} deleted successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error deleting task: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: Update task details
  server.tool(
    "update-task",
    { 
      id: z.string(), 
      title: z.string().optional(), 
      description: z.string().optional() 
    },
    async ({ id, title, description }) => {
      try {
        const task = await store.get("task", id);
        if (!task) {
          return {
            content: [{ type: "text", text: `Task ${id} not found` }],
            isError: true
          };
        }

        // Create update object with only the fields that need to be updated
        const updates: Record<string, any> = {};
        
        // Only update specified fields
        if (title !== undefined) {
          updates.title = title;
        }
        if (description !== undefined) {
          updates.description = description;
        }

        // Update the task directly with the updates object
        await store.update("task", id, updates);

        return {
          content: [{ 
            type: "text", 
            text: `Task ${id} updated successfully` 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error updating task: ${error instanceof Error ? error.message : String(error)}` 
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: List tasks with filtering
  server.tool(
    "list-tasks",
    { 
      state: z.string().optional(),
      limit: z.number().optional()
    },
    async ({ state, limit = 10 }) => {
      try {
        const options: Record<string, unknown> = { 
          pageSize: limit 
        };
        
        // Add state filter if provided
        if (state) {
          options.filter = { state };
        }
        
        const tasks = await store.getCollection("task", options);
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(tasks.toJSON(), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: Get task details
  server.tool(
    "get-task",
    { id: z.string() },
    async ({ id }) => {
      try {
        const task = await store.get("task", id);
        
        if (!task) {
          return {
            content: [{ type: "text", text: `Task ${id} not found` }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(task.toJSON(), null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting task: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: Search tasks by keywords
  server.tool(
    "search-tasks",
    { query: z.string() },
    async ({ query }) => {
      try {
        // Get all tasks first
        const allTasks = await store.getCollection("task");
        const tasksData = allTasks.toJSON();
        
        // Simple search through title and description
        const taskItems = Array.isArray(tasksData.items) ? tasksData.items : [];
        const results = taskItems.filter((task: any) => {
          // Ensure we're looking at the correct properties, accounting for possible nesting
          let title = '';
          let description = '';
          
          // Check if title/description are directly on the task
          if (typeof task.title === 'string') {
            title = task.title.toLowerCase();
          }
          if (typeof task.description === 'string') {
            description = task.description.toLowerCase();
          }
          
          // Check if they're in task.properties
          if (task.properties) {
            if (typeof task.properties.title === 'string') {
              title = task.properties.title.toLowerCase();
            }
            if (typeof task.properties.description === 'string') {
              description = task.properties.description.toLowerCase();
            }
          }
          
          const searchQuery = query.toLowerCase();
          return title.includes(searchQuery) || description.includes(searchQuery);
        });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ items: results, count: results.length }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error searching tasks: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: Get available actions for a task
  server.tool(
    "get-task-actions",
    { id: z.string() },
    async ({ id }) => {
      try {
        const task = await store.get("task", id);
        
        if (!task) {
          return {
            content: [{ type: "text", text: `Task ${id} not found` }],
            isError: true
          };
        }
        
        // Change from "state" to "status" to match what performAction uses
        const currentState = task.getProperty("status") as string || task.getProperty("state") as string;
        // Get state machine definition from task's metadata
        const stateMachine = taskStateMachineDefinition;
        
        if (!stateMachine || !stateMachine.states[currentState]) {
          return {
            content: [{ type: "text", text: `Invalid state machine or state: ${currentState}` }],
            isError: true
          };
        }
        
        const availableActions = stateMachine.states[currentState].allowedActions;
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(availableActions, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting available actions: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // ✅ NEW TOOL: Get possible state transitions
  server.tool(
    "get-state-transitions",
    { state: z.string() },
    async ({ state }) => {
      try {
        // Get state machine definition directly
        const stateMachine = taskStateMachineDefinition;
        
        if (!stateMachine || !stateMachine.states[state]) {
          return {
            content: [{ type: "text", text: `Invalid state: ${state}` }],
            isError: true
          };
        }
        
        const stateInfo = stateMachine.states[state];
        const transitions = stateInfo.transitions || {};
        
        // Format transitions for nicer display
        const formattedTransitions = Object.entries(transitions).map(([action, targetInfo]) => {
          const target = targetInfo as { target: string };
          return {
            action,
            targetState: target.target,
            targetDescription: stateMachine.states[target.target]?.description || ''
          };
        });
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              currentState: state,
              stateDescription: stateInfo.description,
              possibleTransitions: formattedTransitions
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error getting state transitions: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Don't log to stdout as it interferes with MCP protocol
  console.error("✅ MCP server connecting via stdio transport.");
  
  // Start receiving messages via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
}

async function startHttpServer(store: CognitiveStore) {
  // Create the protocol adapter using the factory
  const adapter = ProtocolFactory.createMcpAdapter(store, {
    name: "Todo App HTTP Server",
    version: "1.0.0"
  });
  
  const bridge = createBridge(store, adapter);
  console.error("✅ HTTP bridge created.");

  // --- Define HTTP Request Handler ---
  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;
    let mcpResponse: { status: number; headers?: Record<string, string>; body?: any; } | null = null;

    console.error(`➡️ ${method} ${url.pathname}${url.search}`);

    try {
      let payload: Record<string, unknown> | undefined;
      if (req.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
         try {
            payload = await req.json();
         } catch (e) {
           const errorMsg = e instanceof Error ? e.message : String(e);
           console.error("Could not parse request body as JSON:", errorMsg);
           payload = undefined; // Treat as empty payload if parsing fails
         }
      }

      // --- MCP Command Routing based on Method and Path ---
      if (method === 'GET') {
        // Explore (Resource or Collection)
        const uri = url.pathname + url.search; // Pass full URI with query params
        mcpResponse = await bridge.explore(uri);
      } else if (method === 'POST') {
        if (pathParts.length === 1) {
          // Create Resource
           if (!payload) {
                mcpResponse = { status: 400, body: { error: "Missing request body for create" } };
           } else {
                const uri = url.pathname;
                mcpResponse = await bridge.create(uri, payload);
           }
        } else if (pathParts.length === 3) {
          // Act on Resource (/type/id/action)
          const type = pathParts[0];
          const id = pathParts[1];
          const actionName = pathParts[2];

          const uri = `/${type}/${id}`;
          mcpResponse = await bridge.act(uri, actionName, payload);
        } else {
           mcpResponse = { status: 400, body: { error: "Invalid POST request path. Use /type for create or /type/id/action for act." } };
        }
      } else {
         mcpResponse = { status: 405, body: { error: `Method ${method} not allowed.` } };
      }

    } catch (err) {
        console.error("🚨 Unexpected error during request handling:", err);
        mcpResponse = { status: 500, body: { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) } };
    }

    // --- Construct HTTP Response ---
    const headers = new Headers({ "Content-Type": "application/json" });
    if (mcpResponse?.headers) {
        for (const [key, value] of Object.entries(mcpResponse.headers)) {
            headers.set(key, value);
        }
    }

    console.error(`⬅️ ${mcpResponse?.status || 500}`);

    return new Response(
        mcpResponse?.body ? JSON.stringify(mcpResponse.body, null, 2) : null, // Pretty print body
        {
            status: mcpResponse?.status || 500,
            headers: headers,
        }
    );
  };

  // --- Start Server ---
  const port = 8000;
  console.error(`👂 Listening on http://localhost:${port}`);
  Deno.serve({ port, handler });
}

async function main() {
  console.error("🚀 Starting Todo App...");

  // --- Initialize Dependencies ---
  let kv;
  try {
    // Try the current API first
    kv = await Deno.openKv(); 
  } catch (error: unknown) {
    console.error("Error initializing KV:", error instanceof Error ? error.message : String(error));
    
    // Try alternative approach for older Deno versions
    try {
      // @ts-ignore - For backward compatibility with older Deno versions
      kv = await Deno.openKv?.() || Deno.openKv();
    } catch {
      console.error("Could not initialize Deno KV with any method.");
      console.error("Please make sure you're using Deno v1.35+ and running with --unstable-kv flag");
      console.error("Command: deno run --allow-net --allow-read --allow-write --unstable-kv examples/todo/app.ts");
      Deno.exit(1);
    }
  }
  const kvAdapter = new DenoKvAdapter(kv);
  const store = new CognitiveStore(kvAdapter);
  
  // --- Register State Machines ---
  store.registerStateMachine("task", taskStateMachineDefinition);
  console.error("✅ State machines registered.");

  // Determine which server type to start based on environment variable
  const serverType = Deno.env.get("SERVER_TYPE") || "mcp";
  
  if (serverType === "http") {
    await startHttpServer(store);
  } else {
    // Default to MCP server for Claude Desktop integration
    await setupMcpServer(store);
  }
}

// Run the main function
if (import.meta.main) {
  main().catch((err) => {
    console.error("🚨 Fatal error:", err);
    Deno.exit(1);
  });
} 