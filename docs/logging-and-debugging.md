# 🐞 Logging and Debugging Guide

This guide explains how to use the logging and debugging features of the Cognitive Hypermedia Framework, particularly for MCP (Model Context Protocol) interactions.

## Table of Contents

- [Basic Logging](#basic-logging)
- [Log Levels](#log-levels)
- [Environment-Specific Logging](#environment-specific-logging)
- [MCP Debugging](#mcp-debugging)
- [Performance Monitoring](#performance-monitoring)
- [Advanced Configuration](#advanced-configuration)

## Basic Logging

The framework provides a flexible, platform-agnostic logging system. Here's how to use it:

```typescript
import { createLogger, LogLevel } from "./mod.ts";

// Create a simple logger
const logger = createLogger("myapp");

// Log at different levels
logger.debug("This is a debug message");
logger.info("Application started");
logger.warning("Configuration incomplete", { missing: ["apiKey"] });
logger.error("Failed to connect to database", { error: "Connection timeout" });

// Create a child logger for a specific component
const authLogger = logger.child("auth");
authLogger.info("User logged in", { userId: "user123" });
```

By default, logs are output to the console, but you can configure different transports as needed.

## Log Levels

The framework supports the following log levels, in increasing order of severity:

| Level | Value | Description |
|-------|-------|-------------|
| DEBUG | 0 | Detailed debugging information |
| INFO | 1 | Normal operational messages |
| NOTICE | 2 | Important events, but not problems |
| WARNING | 3 | Potential issues that might require attention |
| ERROR | 4 | Error conditions that should be addressed |
| CRITICAL | 5 | Critical conditions requiring immediate action |
| ALERT | 6 | System is in a critically unstable state |
| EMERGENCY | 7 | System is unusable |

Set the minimum log level to control verbosity:

```typescript
logger.setMinLevel(LogLevel.WARNING); // Only log WARNING and above
```

## Environment-Specific Logging

### Deno File Logging

```typescript
import { createLogger, createDenoFileTransport } from "./mod.ts";

const fileTransport = createDenoFileTransport({
  path: "./logs/app.log",
  rotate: true,
  maxSize: 5 * 1024 * 1024 // 5MB
});

const logger = createLogger("myapp", fileTransport);
```

### Browser Console Logging

```typescript
import { createLogger, createBrowserConsoleTransport } from "./mod.ts";

const browserTransport = createBrowserConsoleTransport({
  useColors: true,
  groupByLogger: true
});

const logger = createLogger("myapp", browserTransport);
```

### Using Multiple Transports

```typescript
import { createLogger, createConsoleTransport, createDenoFileTransport, createCompositeTransport } from "./mod.ts";

const consoleTransport = createConsoleTransport();
const fileTransport = createDenoFileTransport({ path: "./logs/app.log" });

const compositeTransport = createCompositeTransport([
  consoleTransport,
  fileTransport
]);

const logger = createLogger("myapp", compositeTransport);
```

## MCP Debugging

For debugging MCP protocol interactions, use the MCP debugging utilities:

```typescript
import { createMcpDebugger, MessageDirection } from "./mod.ts";

// Create an MCP debugger
const mcpDebugger = createMcpDebugger();

// Log incoming and outgoing messages
mcpDebugger.logIncoming("resource.read", { uri: "file:///example.txt" }, "session-123");
mcpDebugger.logOutgoing("resource.content", { content: "File content..." }, "session-123");

// Time operations
const endTimer = mcpDebugger.startOperation("read-file", "session-123");
// ... perform operation
endTimer(); // Records the time taken

// Get session statistics
const stats = mcpDebugger.getSessionStats();
console.log(stats);
```

### MCP Debug Adapter

For more comprehensive MCP debugging, use the MCP debug adapter:

```typescript
import { createMcpDebugAdapter } from "./mod.ts";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";

// Create a server
const server = new McpServer({ name: "My Server", version: "1.0.0" });

// Create a debug adapter
const debugAdapter = createMcpDebugAdapter({
  includePayloads: true,
  trackPerformance: true,
  // Sanitize sensitive data from logs
  sanitizePayload: (payload) => {
    if (typeof payload === 'object' && payload !== null && 'password' in payload) {
      return { ...payload, password: '******' };
    }
    return payload;
  }
});

// Manually intercept messages
const { messageInterceptor } = debugAdapter;
function onIncomingMessage(type: string, payload: unknown, sessionId: string) {
  const processedPayload = messageInterceptor.interceptIncoming(type, payload, sessionId);
  // Process the message with the server...
}
```

## Performance Monitoring

To track performance metrics:

```typescript
import { createMcpDebugger } from "./mod.ts";

const mcpDebugger = createMcpDebugger();

// Start timing an operation
const endTimer = mcpDebugger.startOperation("database-query");

// Perform the operation
try {
  // ... run database query
  // Record successful completion
  endTimer();
} catch (error) {
  // Record error
  endTimer(error);
}

// View performance statistics
const stats = mcpDebugger.getSessionStats();
console.log(stats);
```

## Advanced Configuration

### Custom Log Transport

You can create custom log transports by implementing the `LogTransport` interface:

```typescript
import { LogData, LogLevel, LogTransport } from "./mod.ts";

// Create a custom transport that sends logs to a remote server
function createRemoteTransport(url: string): LogTransport {
  let minLevel = LogLevel.INFO;
  
  return {
    async log(data: LogData): Promise<void> {
      if (data.level < minLevel) return;
      
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (error) {
        console.error(`Failed to send log to remote server: ${error}`);
      }
    },
    
    setMinLevel(level: LogLevel): void {
      minLevel = level;
    }
  };
}

const remoteLogger = createLogger("myapp", createRemoteTransport("https://logs.example.com/api"));
```

### Custom Log Format

You can customize the log format for file transports:

```typescript
import { createDenoFileTransport, LogData } from "./mod.ts";

const fileTransport = createDenoFileTransport({
  path: "./logs/app.log",
  formatter: (data: LogData): string => {
    const timestamp = data.timestamp.toISOString();
    const level = data.level;
    const message = data.message;
    
    // CSV format
    return `${timestamp},${level},${message},${JSON.stringify(data.context || {})}`;
  }
});
```

### Structured Logging with Context

Use structured logging with context for better log analysis:

```typescript
import { createLogger } from "./mod.ts";

const logger = createLogger("myapp");

// Add default context to all logs from a component
const userLogger = logger.withContext({ component: "user-service" });

function processUser(userId: string) {
  // This context will be merged with the default context
  userLogger.info("Processing user", { userId, action: "process" });
}
``` 