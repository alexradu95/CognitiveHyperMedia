/**
 * 📘 Node.js Winston logging transport.
 * 
 * This module provides integration with the popular Winston logging library
 * for Node.js environments.
 * 
 * Note: This is a facade that expects Winston to be installed in the Node.js
 * environment. Since this is a Deno project, we don't directly depend on Winston.
 */

import { LogData, LogLevel, LogTransport } from "../../../infrastracture/core/logger.ts";

/**
 * 📋 Winston log level mapping
 */
const WinstonLevels = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.NOTICE]: 'notice', 
  [LogLevel.WARNING]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.CRITICAL]: 'crit',
  [LogLevel.ALERT]: 'alert',
  [LogLevel.EMERGENCY]: 'emerg'
};

/**
 * ⚙️ Options for the Winston transport
 */
export interface WinstonTransportOptions {
  /**
   * A pre-configured Winston logger instance
   */
  winstonLogger: unknown;
  
  /**
   * Minimum log level to record
   */
  minLevel?: LogLevel;
  
  /**
   * Whether to include context in metadata
   */
  includeContext?: boolean;
}

/**
 * ✏️ Creates a transport that integrates with Winston logger
 * 
 * Note: This expects a Winston logger to be passed in. It's a facade over
 * Winston to avoid direct dependencies in this Deno project.
 * 
 * @param options - Configuration options for the Winston transport
 * @returns A LogTransport that logs via Winston
 */
export function createWinstonTransport(options: WinstonTransportOptions): LogTransport {
  const {
    winstonLogger,
    minLevel = LogLevel.INFO,
    includeContext = true
  } = options;
  
  let currentLevel = minLevel;
  
  // Verify that we have a valid Winston logger
  if (!winstonLogger || typeof (winstonLogger as any).log !== 'function') {
    throw new Error('Invalid Winston logger provided');
  }
  
  return {
    log(data: LogData): void {
      // Skip if below minimum level
      if (data.level < currentLevel) return;
      
      try {
        const winstonLevel = WinstonLevels[data.level] || 'info';
        const metadata = includeContext ? { 
          timestamp: data.timestamp,
          logger: data.logger,
          ...(data.context || {})
        } : undefined;
        
        // Call Winston logger's log method
        (winstonLogger as any).log({
          level: winstonLevel,
          message: data.message,
          ...(metadata ? { metadata } : {})
        });
      } catch (error: unknown) {
        // Fallback to console if Winston fails
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to log with Winston: ${errorMessage}`);
        console.error(`Original message: ${data.message}`);
      }
    },
    
    setMinLevel(level: LogLevel): void {
      currentLevel = level;
    }
  };
} 