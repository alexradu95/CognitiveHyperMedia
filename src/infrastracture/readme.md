!!!! THIS FOLDER CONTAINS THE INFRASTRUCTURE CODE FOR THE FRAMEWORK !!!!!!
DO NOT USE ANY EXTERNAL PACKAGES OR CODE OUTSIDE OF THE INFRASTRUCTURE FOLDER

# Infrastructure

Core framework infrastructure and utilities.

## Logging

Logging has been consolidated into a unified module in `src/infrastracture/logging.ts`. This provides:

- Environment-aware logging that adapts to browser, Deno, or Node environments
- Console logging with colored output in browser environments
- File-based logging in Deno environments 
- Structured log data with levels, timestamps, and context
- Composable transport system for extensibility

### Usage

```typescript
// Import the default logger
import { logger } from "../infrastracture/logging.ts";

// Log at different levels
logger.info("Application starting");
logger.warning("Configuration incomplete", { missing: ["api_key"] });
logger.error("Failed to connect", { url: "https://example.com" });

// Create a custom logger
import { createLogger, createConsoleTransport, LogLevel } from "../infrastracture/logging.ts";

const customLogger = createLogger("myComponent", createConsoleTransport());
customLogger.setMinLevel(LogLevel.DEBUG);
customLogger.debug("Detailed debugging information");

// Use file logging in Deno environments
import { createFileTransport } from "../infrastracture/logging.ts";

const fileLogger = createLogger("app", [
  createConsoleTransport(),
  createFileTransport({ path: "./logs/app.log" })
]);
```