/**
 * 📝 Simple console-based logging system for the Cognitive Hypermedia Framework.
 * 
 * This module provides a platform-agnostic logging system with a console transport.
 */

/**
 * 📊 Log levels enum to control verbosity of logging
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  NOTICE = 2,
  WARNING = 3,
  ERROR = 4,
  CRITICAL = 5,
  ALERT = 6,
  EMERGENCY = 7,
}

/**
 * 📋 Interface for structured log data
 */
export interface LogData {
  message: string;
  level: LogLevel;
  timestamp: Date;
  context?: Record<string, unknown>;
  logger?: string;
  [key: string]: unknown;
}

/**
 * 🔌 Interface for log transport adapters
 */
export interface LogTransport {
  log(data: LogData): void | Promise<void>;
  setMinLevel(level: LogLevel): void;
}

/**
 * 🔊 Console transport that logs to console
 */
export function createConsoleTransport(): LogTransport {
  let minLevel = LogLevel.INFO;
  
  return {
    log(data: LogData): void {
      if (data.level < minLevel) return;
      
      const timestamp = data.timestamp.toISOString();
      const level = LogLevel[data.level];
      const loggerName = data.logger || 'app';
      const context = data.context ? ` ${JSON.stringify(data.context)}` : '';
      
      let method: 'log' | 'info' | 'warn' | 'error' = 'log';
      
      if (data.level >= LogLevel.ERROR) {
        method = 'error';
      } else if (data.level >= LogLevel.WARNING) {
        method = 'warn';
      } else if (data.level >= LogLevel.INFO) {
        method = 'info';
      }
      
      // For standard log levels, output to stderr to not interfere with MCP output
      if (method === 'log' || method === 'info') {
        console.error(`[${timestamp}] [${level}] [${loggerName}] ${data.message}${context}`);
      } else {
        console[method](`[${timestamp}] [${level}] [${loggerName}] ${data.message}${context}`);
      }
    },
    
    setMinLevel(level: LogLevel): void {
      minLevel = level;
    }
  };
}

/**
 * ✨ Creates a logger instance 
 * 
 * @param name - The name of the logger
 * @returns A logger object with methods for each log level
 */
export function createLogger(name: string) {
  const loggerTransport = createConsoleTransport();
  
  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const data: LogData = {
      message,
      level,
      timestamp: new Date(),
      context,
      logger: name,
    };
    
    try {
      loggerTransport.log(data);
    } catch (error) {
      console.error(`Failed to log: ${error}`);
    }
  }
  
  return {
    debug: (message: string, context?: Record<string, unknown>) => log(LogLevel.DEBUG, message, context),
    info: (message: string, context?: Record<string, unknown>) => log(LogLevel.INFO, message, context),
    notice: (message: string, context?: Record<string, unknown>) => log(LogLevel.NOTICE, message, context),
    warning: (message: string, context?: Record<string, unknown>) => log(LogLevel.WARNING, message, context),
    error: (message: string, context?: Record<string, unknown>) => log(LogLevel.ERROR, message, context),
    critical: (message: string, context?: Record<string, unknown>) => log(LogLevel.CRITICAL, message, context),
    alert: (message: string, context?: Record<string, unknown>) => log(LogLevel.ALERT, message, context),
    emergency: (message: string, context?: Record<string, unknown>) => log(LogLevel.EMERGENCY, message, context),
    
    withContext: (defaultContext: Record<string, unknown>) => {
      const methods = {
        debug: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.DEBUG, message, { ...defaultContext, ...additionalContext }),
        info: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.INFO, message, { ...defaultContext, ...additionalContext }),
        notice: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.NOTICE, message, { ...defaultContext, ...additionalContext }),
        warning: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.WARNING, message, { ...defaultContext, ...additionalContext }),
        error: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.ERROR, message, { ...defaultContext, ...additionalContext }),
        critical: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.CRITICAL, message, { ...defaultContext, ...additionalContext }),
        alert: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.ALERT, message, { ...defaultContext, ...additionalContext }),
        emergency: (message: string, additionalContext?: Record<string, unknown>) => 
          log(LogLevel.EMERGENCY, message, { ...defaultContext, ...additionalContext }),
      };
      
      return methods;
    },
    
    setMinLevel: (level: LogLevel) => {
      loggerTransport.setMinLevel(level);
    },
    
    child: (childName: string) => {
      return createLogger(`${name}:${childName}`);
    }
  };
}

/**
 * 🌐 Default application logger instance
 */
export const logger = createLogger('app');

/**
 * 🌐 Alias for backward compatibility
 */
export const coreLogger = logger; 