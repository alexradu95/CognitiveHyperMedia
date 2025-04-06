/**
 * 🔍 MCP protocol debugging adapter.
 * 
 * This module provides specialized adapters for debugging MCP protocol
 * messages and interactions with the McpServer.
 */

import { 
  createLogger, 
  LogLevel, 
  LogTransport 
} from "../../../infrastracture/core/logger.ts";
import { 
  createMcpDebugger, 
  MessageDirection 
} from "../../../infrastracture/core/debug.ts";

/**
 * ⚙️ Options for creating an MCP debug adapter
 */
export interface McpDebugAdapterOptions {
  /**
   * Transport to use for MCP message logging
   */
  transport?: LogTransport;
  
  /**
   * Minimum log level
   */
  minLevel?: LogLevel;
  
  /**
   * Whether to include full message payloads (can be verbose)
   */
  includePayloads?: boolean;
  
  /**
   * Maximum payload size to log (if includePayloads is true)
   */
  maxPayloadSize?: number;
  
  /**
   * Function to sanitize sensitive data from payloads
   */
  sanitizePayload?: (payload: unknown) => unknown;
  
  /**
   * Whether to track and log performance metrics
   */
  trackPerformance?: boolean;
}

/**
 * 🛠️ Creates a debug adapter for MCP servers and clients
 * 
 * This adapter can be attached to MCP servers to provide detailed
 * logging of protocol messages and interactions.
 * 
 * @param options - Configuration options for the debug adapter
 * @returns An object with methods to intercept and debug MCP communications
 */
export function createMcpDebugAdapter(options: McpDebugAdapterOptions = {}) {
  const {
    minLevel = LogLevel.DEBUG,
    includePayloads = true,
    maxPayloadSize = 10 * 1024, // 10KB limit by default
    trackPerformance = true,
    sanitizePayload = (payload) => payload // Default is no sanitization
  } = options;
  
  // Create dedicated MCP debugger
  const mcpDebugger = createMcpDebugger({
    enabled: true,
    logLevel: minLevel
  });
  
  // Performance tracking
  const timers = new Map<string, number>();
  
  /**
   * Helper to safely stringify potentially large payloads
   */
  function safeStringify(payload: unknown): string {
    if (!includePayloads) return "[Payload logging disabled]";
    
    try {
      // First sanitize the payload
      const sanitized = sanitizePayload(payload);
      
      // Then stringify with size limits
      const json = JSON.stringify(sanitized, null, 2);
      if (maxPayloadSize > 0 && json.length > maxPayloadSize) {
        return `${json.substring(0, maxPayloadSize)}... [truncated, ${json.length} bytes total]`;
      }
      return json;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `[Error stringifying payload: ${errorMessage}]`;
    }
  }
  
  /**
   * Start timing an operation for performance tracking
   */
  function startTimer(operationId: string): void {
    if (!trackPerformance) return;
    timers.set(operationId, performance.now());
  }
  
  /**
   * End timing an operation and return the duration in ms
   */
  function endTimer(operationId: string): number {
    if (!trackPerformance) return 0;
    
    const startTime = timers.get(operationId);
    if (startTime === undefined) return 0;
    
    const duration = performance.now() - startTime;
    timers.delete(operationId);
    return duration;
  }
  
  return {
    /**
     * 🔄 MCP message interceptor for debugging
     */
    messageInterceptor: {
      /**
       * 📥 Intercept and log incoming MCP messages
       * 
       * @param messageType - Type of the MCP message
       * @param payload - The message payload
       * @param sessionId - Optional session identifier
       * @returns The unmodified payload
       */
      interceptIncoming(msgType: string, msgPayload: unknown, msgSessionId?: string): unknown {
        const operationId = `${msgSessionId || 'unknown'}-${msgType}-${Date.now()}`;
        startTimer(operationId);
        
        mcpDebugger.logIncoming(
          msgType, 
          {
            summary: `Received ${msgType} message`,
            payload: includePayloads ? safeStringify(msgPayload) : undefined,
            sessionId: msgSessionId
          },
          msgSessionId
        );
        
        return msgPayload;
      },
      
      /**
       * 📤 Intercept and log outgoing MCP messages
       * 
       * @param messageType - Type of the MCP message
       * @param payload - The message payload
       * @param sessionId - Optional session identifier
       * @returns The unmodified payload
       */
      interceptOutgoing(msgType: string, msgPayload: unknown, msgSessionId?: string): unknown {
        const operationId = `${msgSessionId || 'unknown'}-${msgType}-${Date.now()}`;
        const duration = endTimer(operationId);
        
        mcpDebugger.logOutgoing(
          msgType, 
          {
            summary: `Sent ${msgType} message`,
            payload: includePayloads ? safeStringify(msgPayload) : undefined,
            sessionId: msgSessionId,
            duration: duration > 0 ? duration : undefined
          },
          msgSessionId
        );
        
        return msgPayload;
      }
    },
    
    /**
     * 🔌 Connect this adapter to an MCP server
     * 
     * @param server - The MCP server instance to debug
     */
    connectToServer(server: any): void {
      // This is a placeholder for when we implement direct server integration
      // It would hook into the MCP server's message handling pipeline
      console.warn('Direct server integration not implemented yet');
    },
    
    /**
     * 📊 Get debug statistics
     */
    getStats(): Record<string, unknown> {
      return {
        sessionStats: mcpDebugger.getSessionStats(),
        activeTimers: timers.size
      };
    },
    
    /**
     * 🧹 Clear debug data
     */
    clear(): void {
      mcpDebugger.clearSessions();
      timers.clear();
    }
  };
} 