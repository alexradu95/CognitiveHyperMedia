/**
 * 📄 Core storage adapter interface
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
 * 🔌 Interface for storage adapters
 * 
 * Simplified interface focused on essential CRUD operations
 */
export interface IStorageAdapter {
  /**
   * Create a new record in storage
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @param data - Resource data to store
   */
  create(type: string, id: string, data: Record<string, unknown>): Promise<void>;
  
  /**
   * Retrieve a record from storage
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @returns Record data or null if not found
   */
  get(type: string, id: string): Promise<Record<string, unknown> | null>;
  
  /**
   * Update an existing record
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @param data - Updated resource data
   */
  update(type: string, id: string, data: Record<string, unknown>): Promise<void>;
  
  /**
   * Delete a record from storage
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   */
  delete(type: string, id: string): Promise<void>;
  
  /**
   * List records of a specific type
   * 
   * @param type - Resource type
   * @param options - Query options (filter, pagination)
   * @returns Array of matching records and total count
   */
  list(type: string, options?: ListOptions): Promise<ListResult>;
  
  /**
   * List all resource types
   * 
   * @returns Array of resource type strings
   */
  listTypes(): Promise<string[]>;
} 