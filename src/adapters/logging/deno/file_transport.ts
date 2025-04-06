/**
 * 📁 Deno-specific file logging transport.
 * 
 * This module provides a transport that logs to files using Deno's file system API.
 */

import { LogData, LogLevel, LogTransport } from "../../../infrastracture/core/logger.ts";

/**
 * ⚙️ Options for the Deno file transport
 */
export interface DenoFileTransportOptions {
  /**
   * Path to the log file
   */
  path: string;
  
  /**
   * Minimum log level to record
   */
  minLevel?: LogLevel;
  
  /**
   * Whether to append to an existing file (true) or overwrite (false)
   */
  append?: boolean;
  
  /**
   * Whether to rotate log files when they reach a certain size
   */
  rotate?: boolean;
  
  /**
   * Maximum file size in bytes before rotation (if rotate is true)
   */
  maxSize?: number;
  
  /**
   * Custom formatter for log entries
   */
  formatter?: (data: LogData) => string;
}

/**
 * 🔧 Default log entry formatter
 */
function defaultFormatter(data: LogData): string {
  const timestamp = data.timestamp.toISOString();
  const level = LogLevel[data.level];
  const logger = data.logger || 'app';
  const message = data.message;
  
  // Basic structured log format
  return JSON.stringify({
    timestamp,
    level,
    logger,
    message,
    ...data.context
  });
}

/**
 * ✏️ Creates a file transport for logging to files in Deno
 * 
 * @param options - Configuration options for the file transport
 * @returns A LogTransport that writes to files
 */
export function createDenoFileTransport(options: DenoFileTransportOptions): LogTransport {
  const {
    path,
    minLevel = LogLevel.INFO,
    append = true,
    rotate = false,
    maxSize = 10 * 1024 * 1024, // 10MB default
    formatter = defaultFormatter
  } = options;
  
  let currentLevel = minLevel;
  let currentFileSize = 0;
  
  // Get the current size of the log file if it exists
  try {
    const fileInfo = Deno.statSync(path);
    currentFileSize = fileInfo.size;
  } catch (error: unknown) {
    if (error instanceof Error && !(error instanceof Deno.errors.NotFound)) {
      console.error(`Error checking log file size: ${error.message}`);
    }
    // File doesn't exist yet, size remains 0
  }
  
  return {
    log(data: LogData): void {
      // Skip if below minimum level
      if (data.level < currentLevel) return;
      
      try {
        const logEntry = formatter(data) + "\n";
        const encoder = new TextEncoder();
        const logBytes = encoder.encode(logEntry);
        
        // Check if we need to rotate the file
        if (rotate && currentFileSize + logBytes.length > maxSize) {
          // Rotation logic: Create a new file with timestamp suffix
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const rotatedPath = `${path}.${timestamp}`;
          
          try {
            Deno.copyFileSync(path, rotatedPath);
            Deno.truncateSync(path, 0);
            currentFileSize = 0;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to rotate log file: ${errorMessage}`);
          }
        }
        
        // Append or write to file
        Deno.writeFileSync(path, logBytes, { 
          append, 
          create: true 
        });
        
        // Update file size
        currentFileSize += logBytes.length;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to write to log file: ${errorMessage}`);
      }
    },
    
    setMinLevel(level: LogLevel): void {
      currentLevel = level;
    }
  };
} 