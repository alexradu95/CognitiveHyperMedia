# 🐞 Logging and Debugging Guide

This guide explains how to use the logging features of the Cognitive Hypermedia Framework.

## Table of Contents

- [Basic Logging](#basic-logging)
- [Log Levels](#log-levels)
- [Environment-Specific Logging](#environment-specific-logging)
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

## Performance Monitoring

You can add custom timing to track performance metrics:

```typescript
import { createLogger } from "./mod.ts";

const logger = createLogger("performance");

function timeOperation(name: string, fn: () => Promise<any>) {
  return async () => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      logger.info(`Operation ${name} completed`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Operation ${name} failed`, { duration, error });
      throw error;
    }
  };
}

// Usage
const timedDatabaseQuery = timeOperation("database-query", async () => {
  // database operation
});

await timedDatabaseQuery();
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
``` 