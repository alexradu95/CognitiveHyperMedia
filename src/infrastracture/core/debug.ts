/**
 * 🐞 Debugging utilities for the MCP protocol integration.
 * 
 * This module extends the core logging system with MCP-specific debugging 
 * capabilities to simplify protocol debugging and message tracing.
 */

import { createLogger, LogLevel, LogTransport } from "./logger.ts";
import { AppError } from "./errors.ts";

/**
 * 📡 Message direction for MCP communication
 */
export enum MessageDirection {
  INCOMING = "incoming",
  OUTGOING = "outgoing"
}

/**
 * 📋 Structure of an MCP debug event
 */
export interface McpDebugEvent {
  timestamp: Date;
  direction: MessageDirection;
  messageType: string;
  payload: unknown;
  sessionId?: string;
  duration?: number;
  error?: Error;
}

/**
 * 🎯 Interface for MCP debug listeners
 */
export interface McpDebugListener {
  onMessage(event: McpDebugEvent): void | Promise<void>;
}

/**
 * 🚨 Error thrown during MCP debugging
 */
export class McpDebugError extends AppError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 🔍 Create an MCP debug logger for tracing protocol messages
 * 
 * @param options - Configuration options for the MCP debugger
 * @returns An MCP debugger object
 */
export function createMcpDebugger(options: {
  enabled?: boolean;
  logTransport?: LogTransport;
  logLevel?: LogLevel;
  listeners?: McpDebugListener[];
} = {}) {
  // Use let for variables that might be changed
  let isEnabled = options.enabled !== undefined ? options.enabled : true;
  const logLevel = options.logLevel || LogLevel.DEBUG;
  const listeners = [...(options.listeners || [])];
  
  // Create a dedicated logger for MCP messages
  const logger = createLogger('mcp');
  logger.setMinLevel(logLevel);
  
  // Track active sessions
  const activeSessions = new Map<string, {
    startTime: Date;
    messagesIn: number;
    messagesOut: number;
    errors: number;
  }>();
  
  // Function to log MCP messages
  function logMessage(event: McpDebugEvent): void {
    if (!isEnabled) return;
    
    // Update session stats if we have a session ID
    if (event.sessionId) {
      const session = activeSessions.get(event.sessionId) || {
        startTime: new Date(),
        messagesIn: 0,
        messagesOut: 0,
        errors: 0
      };
      
      if (event.direction === MessageDirection.INCOMING) {
        session.messagesIn++;
      } else {
        session.messagesOut++;
      }
      
      if (event.error) {
        session.errors++;
      }
      
      activeSessions.set(event.sessionId, session);
    }
    
    // Format the log message
    const dirSymbol = event.direction === MessageDirection.INCOMING ? "←" : "→";
    const durationStr = event.duration ? `(${event.duration}ms)` : '';
    const sessionStr = event.sessionId ? `[${event.sessionId}]` : '';
    
    const context = {
      messageType: event.messageType,
      direction: event.direction,
      payload: event.payload,
      ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      ...(event.duration ? { duration: event.duration } : {}),
      ...(event.error ? { error: event.error.message, stack: event.error.stack } : {})
    };
    
    const message = `${dirSymbol} ${event.messageType} ${sessionStr} ${durationStr}`;
    
    if (event.error) {
      logger.error(message, context);
    } else {
      logger.debug(message, context);
    }
    
    // Notify all registered listeners
    for (const listener of listeners) {
      try {
        listener.onMessage(event);
      } catch (error) {
        logger.error(`Listener error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  return {
    /**
     * 📥 Log an incoming MCP message
     */
    logIncoming(messageType: string, payload: unknown, sessionId?: string, error?: Error): void {
      logMessage({
        timestamp: new Date(),
        direction: MessageDirection.INCOMING,
        messageType,
        payload,
        sessionId,
        error
      });
    },
    
    /**
     * 📤 Log an outgoing MCP message
     */
    logOutgoing(messageType: string, payload: unknown, sessionId?: string, error?: Error): void {
      logMessage({
        timestamp: new Date(),
        direction: MessageDirection.OUTGOING,
        messageType,
        payload,
        sessionId,
        error
      });
    },
    
    /**
     * ⏱️ Start a timed MCP operation for performance tracking
     */
    startOperation(messageType: string, sessionId?: string): () => void {
      const startTime = Date.now();
      
      return (error?: Error) => {
        const duration = Date.now() - startTime;
        logMessage({
          timestamp: new Date(),
          direction: MessageDirection.OUTGOING, // Default for operations
          messageType,
          payload: { duration },
          sessionId,
          duration,
          error
        });
      };
    },
    
    /**
     * 🧩 Create a message interceptor for an MCP client or server
     * 
     * This returns an object that can be used to intercept and log
     * messages in MCP transports.
     */
    createMessageInterceptor(sessionId?: string) {
      return {
        interceptIncoming(messageType: string, payload: unknown): unknown {
          logMessage({
            timestamp: new Date(),
            direction: MessageDirection.INCOMING,
            messageType,
            payload,
            sessionId
          });
          return payload; // Pass through unchanged
        },
        
        interceptOutgoing(messageType: string, payload: unknown): unknown {
          logMessage({
            timestamp: new Date(),
            direction: MessageDirection.OUTGOING,
            messageType,
            payload,
            sessionId
          });
          return payload; // Pass through unchanged
        }
      };
    },
    
    /**
     * 📊 Get session statistics for active MCP sessions
     */
    getSessionStats() {
      const stats = new Map();
      
      for (const [sessionId, data] of activeSessions.entries()) {
        const durationMs = Date.now() - data.startTime.getTime();
        stats.set(sessionId, {
          ...data,
          durationMs,
          messagesPerSecond: durationMs > 0 ? 
            (data.messagesIn + data.messagesOut) / (durationMs / 1000) : 0
        });
      }
      
      return stats;
    },
    
    /**
     * 🎧 Register a new debug listener
     */
    addListener(listener: McpDebugListener): void {
      listeners.push(listener);
    },
    
    /**
     * 🔌 Remove a previously registered debug listener
     */
    removeListener(listener: McpDebugListener): void {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    },
    
    /**
     * 🎚️ Set whether debugging is enabled
     */
    setEnabled(enabled: boolean): void {
      isEnabled = enabled;
    },
    
    /**
     * 🧹 Clear all session data
     */
    clearSessions(): void {
      activeSessions.clear();
    }
  };
}

/**
 * 🌐 Global MCP debugger instance
 */
export const mcpDebugger = createMcpDebugger(); 