/**
 * 📄 Types for storage adapter operations and options
 */

/**
 * 🔍 Options for listing records
 */
export interface ListOptions {
  /** Filter criteria for the listing */
  filter?: Record<string, unknown>;
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Sort field and direction */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * 📊 Result of a list operation
 */
export interface ListResult {
  /** Array of matching records */
  items: Array<Record<string, unknown>>;
  /** Total count of matching items (before pagination) */
  totalItems: number;
}

/**
 * 🔄 Options for batch operations
 */
export interface BatchOptions {
  /** Whether to continue on error */
  continueOnError?: boolean;
}

/**
 * 🔌 Interface for storage adapters that can be used with CognitiveStore.
 * 
 * @interface IStorageAdapter
 */
export interface IStorageAdapter {
  /**
   * Create a new record in storage
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @param data - Resource data to store
   * @returns Promise that resolves when operation completes
   */
  create(type: string, id: string, data: Record<string, unknown>): Promise<void>;
  
  /**
   * Retrieve a record from storage
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @returns Promise with record data or null if not found
   */
  get(type: string, id: string): Promise<Record<string, unknown> | null>;
  
  /**
   * Update an existing record
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @param data - Updated resource data
   * @returns Promise that resolves when operation completes
   */
  update(type: string, id: string, data: Record<string, unknown>): Promise<void>;
  
  /**
   * Delete a record from storage
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @returns Promise that resolves when operation completes
   */
  delete(type: string, id: string): Promise<void>;
  
  /**
   * List records of a specific type with optional filtering and pagination
   * 
   * @param type - Resource type
   * @param options - Query options (filter, pagination, etc.)
   * @returns Promise with array of matching records and total count
   */
  list(type: string, options?: ListOptions): Promise<ListResult>;
  
  /**
   * 📚 List all resource types available in the storage
   * 
   * @returns Promise resolving to an array of resource type strings
   */
  listTypes?(): Promise<string[]>;
  
  /**
   * 🧪 Check if a record exists
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @returns Promise resolving to true if record exists, false otherwise
   */
  exists?(type: string, id: string): Promise<boolean>;
  
  /**
   * 📦 Batch create multiple records
   * 
   * @param items - Array of items to create
   * @param options - Batch operation options
   * @returns Promise that resolves when all operations complete
   */
  batchCreate?(items: Array<{
    type: string;
    id: string;
    data: Record<string, unknown>;
  }>, options?: BatchOptions): Promise<void>;
  
  /**
   * 📦 Batch update multiple records
   * 
   * @param items - Array of items to update
   * @param options - Batch operation options
   * @returns Promise that resolves when all operations complete
   */
  batchUpdate?(items: Array<{
    type: string;
    id: string;
    data: Record<string, unknown>;
  }>, options?: BatchOptions): Promise<void>;
  
  /**
   * 📦 Batch delete multiple records
   * 
   * @param items - Array of items to delete
   * @param options - Batch operation options
   * @returns Promise that resolves when all operations complete
   */
  batchDelete?(items: Array<{
    type: string;
    id: string;
  }>, options?: BatchOptions): Promise<void>;
}

/**
 * 🏭 Helper function to create a default implementation of optional methods
 * using the required ones
 * 
 * @param adapter - Base storage adapter with required methods
 * @returns Enhanced adapter with default implementations for optional methods
 */
export function enhanceStorageAdapter(adapter: IStorageAdapter): Required<IStorageAdapter> {
  return {
    ...adapter,
    
    // Provide default implementation for listTypes if not present
    listTypes: adapter.listTypes ?? (async () => {
      // Default implementation can't provide this information
      // without scanning all storage
      return [];
    }),
    
    // Provide default implementation for exists if not present
    exists: adapter.exists ?? (async (type, id) => {
      const result = await adapter.get(type, id);
      return result !== null;
    }),
    
    // Provide default implementation for batchCreate if not present
    batchCreate: adapter.batchCreate ?? (async (items, options = {}) => {
      const { continueOnError = false } = options;
      
      if (continueOnError) {
        // Execute all operations, collecting errors
        const errors: Error[] = [];
        
        await Promise.all(items.map(async ({ type, id, data }) => {
          try {
            await adapter.create(type, id, data);
          } catch (error) {
            errors.push(error as Error);
          }
        }));
        
        if (errors.length > 0) {
          throw new Error(`Batch create completed with ${errors.length} errors`);
        }
      } else {
        // Execute operations sequentially, stopping on first error
        for (const { type, id, data } of items) {
          await adapter.create(type, id, data);
        }
      }
    }),
    
    // Provide default implementation for batchUpdate if not present
    batchUpdate: adapter.batchUpdate ?? (async (items, options = {}) => {
      const { continueOnError = false } = options;
      
      if (continueOnError) {
        // Execute all operations, collecting errors
        const errors: Error[] = [];
        
        await Promise.all(items.map(async ({ type, id, data }) => {
          try {
            await adapter.update(type, id, data);
          } catch (error) {
            errors.push(error as Error);
          }
        }));
        
        if (errors.length > 0) {
          throw new Error(`Batch update completed with ${errors.length} errors`);
        }
      } else {
        // Execute operations sequentially, stopping on first error
        for (const { type, id, data } of items) {
          await adapter.update(type, id, data);
        }
      }
    }),
    
    // Provide default implementation for batchDelete if not present
    batchDelete: adapter.batchDelete ?? (async (items, options = {}) => {
      const { continueOnError = false } = options;
      
      if (continueOnError) {
        // Execute all operations, collecting errors
        const errors: Error[] = [];
        
        await Promise.all(items.map(async ({ type, id }) => {
          try {
            await adapter.delete(type, id);
          } catch (error) {
            errors.push(error as Error);
          }
        }));
        
        if (errors.length > 0) {
          throw new Error(`Batch delete completed with ${errors.length} errors`);
        }
      } else {
        // Execute operations sequentially, stopping on first error
        for (const { type, id } of items) {
          await adapter.delete(type, id);
        }
      }
    })
  };
} 