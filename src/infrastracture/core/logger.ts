/**
 * 📝 Flexible, extensible logging system for the Cognitive Hypermedia Framework.
 * 
 * This module provides a platform-agnostic logging system that can be extended
 * with custom transport adapters for different output destinations.
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
 * 📁 File transport that logs to a file
 */
export function createFileTransport(options: { path: string }): LogTransport {
  let minLevel = LogLevel.INFO;
  
  return {
    log(data: LogData): void {
      if (data.level < minLevel) return;
      
      // Since we're platform-agnostic, we're leaving the actual file writing
      // implementation to be handled by the environment-specific adapter
      // This would be implemented in the adapters layer
      console.error(`[FileTransport] Would log to ${options.path}: ${JSON.stringify(data)}`);
    },
    
    setMinLevel(level: LogLevel): void {
      minLevel = level;
    }
  };
}

/**
 * 🧩 Composite transport that logs to multiple transports
 */
export function createCompositeTransport(transports: LogTransport[]): LogTransport {
  let minLevel = LogLevel.INFO;
  
  return {
    log(data: LogData): Promise<void> {
      if (data.level < minLevel) return Promise.resolve();
      
      const promises = transports.map(transport => {
        const result = transport.log(data);
        return result instanceof Promise ? result : Promise.resolve(result);
      });
      
      return Promise.all(promises).then(() => {});
    },
    
    setMinLevel(level: LogLevel): void {
      minLevel = level;
      transports.forEach(transport => transport.setMinLevel(level));
    }
  };
}

/**
 * ✨ Creates a logger instance with the specified transports
 * 
 * @param name - The name of the logger
 * @param transports - An array of log transports to use
 * @returns A logger object with methods for each log level
 */
export function createLogger(name: string, transports: LogTransport | LogTransport[] = [createConsoleTransport()]) {
  const loggerTransports = Array.isArray(transports) ? transports : [transports];
  
  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const data: LogData = {
      message,
      level,
      timestamp: new Date(),
      context,
      logger: name,
    };
    
    loggerTransports.forEach(transport => {
      try {
        transport.log(data);
      } catch (error) {
        console.error(`Failed to log with transport: ${error}`);
      }
    });
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
      loggerTransports.forEach(transport => transport.setMinLevel(level));
    },
    
    child: (childName: string) => {
      return createLogger(`${name}:${childName}`, loggerTransports);
    }
  };
}

/**
 * 🌐 Global default logger instance
 */
export const logger = createLogger('app'); 