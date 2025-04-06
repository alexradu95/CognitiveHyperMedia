/**
 * 🌐 Browser-specific console logging transport.
 * 
 * This module provides enhanced console logging functionality for browser environments
 * with support for styling, grouping, and other browser-specific features.
 */

import { LogData, LogLevel, LogTransport } from "../../../infrastracture/core/logger.ts";

/**
 * ⚙️ Options for the browser console transport
 */
export interface BrowserConsoleTransportOptions {
  /**
   * Minimum log level to display
   */
  minLevel?: LogLevel;
  
  /**
   * Whether to use colors for different log levels
   */
  useColors?: boolean;
  
  /**
   * Whether to include timestamps in the output
   */
  showTimestamps?: boolean;
  
  /**
   * Whether to show the log level
   */
  showLevel?: boolean;
  
  /**
   * Whether to group logs by logger name
   */
  groupByLogger?: boolean;
  
  /**
   * Whether to collapse groups by default
   */
  collapseGroups?: boolean;
}

/**
 * 🎨 Color mapping for different log levels
 */
const levelColors = {
  [LogLevel.DEBUG]: "color: #6c757d", // Gray
  [LogLevel.INFO]: "color: #0d6efd", // Blue
  [LogLevel.NOTICE]: "color: #0dcaf0", // Cyan
  [LogLevel.WARNING]: "color: #fd7e14", // Orange
  [LogLevel.ERROR]: "color: #dc3545", // Red
  [LogLevel.CRITICAL]: "color: #dc3545; font-weight: bold", // Bold red
  [LogLevel.ALERT]: "color: #dc3545; font-weight: bold; text-decoration: underline", // Bold underlined red
  [LogLevel.EMERGENCY]: "background: #dc3545; color: white; font-weight: bold", // White on red
};

/**
 * 🖥️ Creates an enhanced console transport for browser environments
 * 
 * @param options - Configuration options for the browser console
 * @returns A LogTransport that uses the browser console with enhanced styling
 */
export function createBrowserConsoleTransport(options: BrowserConsoleTransportOptions = {}): LogTransport {
  const {
    minLevel = LogLevel.INFO,
    useColors = true,
    showTimestamps = true,
    showLevel = true,
    groupByLogger = false,
    collapseGroups = false
  } = options;
  
  // Keep track of active logger groups
  const activeLoggerGroups = new Set<string>();
  
  let currentLevel = minLevel;
  
  return {
    log(data: LogData): void {
      // Skip if below minimum level
      if (data.level < currentLevel) return;
      
      const timestamp = showTimestamps ? `[${data.timestamp.toISOString()}] ` : '';
      const level = showLevel ? `[${LogLevel[data.level]}] ` : '';
      const loggerName = data.logger || 'app';
      const message = data.message;
      
      // Determine which console method to use
      let method: 'log' | 'info' | 'warn' | 'error' | 'debug' = 'log';
      
      if (data.level >= LogLevel.ERROR) {
        method = 'error';
      } else if (data.level >= LogLevel.WARNING) {
        method = 'warn';
      } else if (data.level >= LogLevel.INFO) {
        method = 'info';
      } else if (data.level <= LogLevel.DEBUG) {
        method = 'debug';
      }
      
      try {
        // Handle logger grouping if enabled
        if (groupByLogger) {
          if (!activeLoggerGroups.has(loggerName)) {
            // Create a new group for this logger
            if (collapseGroups) {
              console.groupCollapsed(`Logger: ${loggerName}`);
            } else {
              console.group(`Logger: ${loggerName}`);
            }
            activeLoggerGroups.add(loggerName);
          }
        }
        
        // Format the log entry with or without colors
        if (useColors && typeof window !== 'undefined') {
          const color = levelColors[data.level] || '';
          console[method](`%c${timestamp}${level}${message}`, color, data.context);
        } else {
          console[method](`${timestamp}${level}${message}`, data.context);
        }
      } catch (error: unknown) {
        // Fallback to basic console.log if something goes wrong
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Failed to log: ${errorMessage}`, data);
      }
    },
    
    setMinLevel(level: LogLevel): void {
      currentLevel = level;
    }
  };
} 