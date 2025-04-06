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
  list(type: string, options?: {
    filter?: Record<string, unknown>,
    page?: number,
    pageSize?: number
  }): Promise<{
    items: Array<Record<string, unknown>>;
    totalItems: number;
  }>;
  
  /**
   * 📚 List all resource types available in the storage
   * 
   * @returns Promise resolving to an array of resource type strings
   */
  listTypes?(): Promise<string[]>;
} 