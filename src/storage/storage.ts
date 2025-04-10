/**
 * 📄 Core storage adapter interface and Deno KV implementation
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
  /** Optional sort configuration */
  sort?: { 
    field: string; 
    direction: "asc" | "desc" 
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

/**
 * 🗄️ Deno KV implementation of storage
 * 
 * @implements IStorageAdapter
 */
export class DenoKvStorage implements IStorageAdapter {
  private kv: Deno.Kv;
  
  /**
   * Create a new DenoKvStorage
   * 
   * @param kv - Deno KV instance
   */
  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }
  
  /**
   * ➕ Create a new record in Deno KV
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @param data - Resource data to store
   */
  async create(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    const key = [type, id];
    await this.kv.set(key, data);
  }
  
  /**
   * 🔍 Retrieve a record from Deno KV
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @returns Record data or null if not found
   */
  async get(type: string, id: string): Promise<Record<string, unknown> | null> {
    const key = [type, id];
    const result = await this.kv.get<Record<string, unknown>>(key);
    return result.value;
  }
  
  /**
   * 🔄 Update an existing record in Deno KV
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @param data - Updated resource data
   */
  async update(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    const key = [type, id];
    await this.kv.set(key, data);
  }
  
  /**
   * 🗑️ Delete a record from Deno KV
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   */
  async delete(type: string, id: string): Promise<void> {
    const key = [type, id];
    await this.kv.delete(key);
  }
  
  /**
   * 📋 List records of a specific type from Deno KV
   * 
   * @param type - Resource type
   * @param options - Query options (filter, pagination, etc.)
   * @returns Array of matching records and total count
   */
  async list(type: string, options?: ListOptions): Promise<ListResult> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 10;
    const filter = options?.filter || {};
    const sort = options?.sort;
    
    // Get all entries of the specified type
    const prefix = [type];
    const entries = await this.kv.list<Record<string, unknown>>({ prefix });
    
    // Convert to array of values and filter
    let items: Array<Record<string, unknown>> = [];
    for await (const entry of entries) {
      if (entry.value) {
        items.push(entry.value);
      }
    }
    
    // Apply filters
    if (Object.keys(filter).length > 0) {
      items = items.filter(item => {
        for (const [key, value] of Object.entries(filter)) {
          if (item[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Apply sorting
    if (sort) {
      items.sort((a, b) => {
        const aValue = a[sort.field];
        const bValue = b[sort.field];
        
        if (aValue === undefined || bValue === undefined) {
          return 0;
        }
        
        const comparison = String(aValue).localeCompare(String(bValue));
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    } else {
      // Default sort by createdAt (descending) if available
      items.sort((a, b) => {
        const aCreatedAt = a.createdAt as string;
        const bCreatedAt = b.createdAt as string;
        if (!aCreatedAt || !bCreatedAt) return 0;
        
        // Parse dates and compare timestamps to ensure consistent ordering
        return new Date(aCreatedAt).getTime() - new Date(bCreatedAt).getTime();
      });
    }
    
    // Calculate pagination
    const totalItems = items.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      totalItems
    };
  }
  
  /**
   * 📚 List all resource types available in the storage
   * 
   * @returns Array of resource type strings
   */
  async listTypes(): Promise<string[]> {
    const entries = await this.kv.list({ prefix: [] });
    const types = new Set<string>();
    
    for await (const entry of entries) {
      const key = entry.key;
      if (key.length > 0 && typeof key[0] === 'string') {
        types.add(key[0] as string);
      }
    }
    
    return Array.from(types);
  }
  
  /**
   * 🧪 Check if a record exists
   * 
   * @param type - Resource type
   * @param id - Resource identifier
   * @returns True if record exists, false otherwise
   */
  async exists(type: string, id: string): Promise<boolean> {
    const key = [type, id];
    const result = await this.kv.get(key);
    return result.value !== null;
  }
}

/**
 * 🏭 Create a new DenoKvStorage instance
 * 
 * @param path - Optional path to the KV database
 * @returns A new DenoKvStorage instance
 */
export async function createDenoKvStorage(path?: string): Promise<DenoKvStorage> {
  const kv = await Deno.openKv(path);
  return new DenoKvStorage(kv);
}

/**
 * ⚙️ Default function to create a standard storage implementation (Deno KV)
 * 
 * @param path - Optional path to the KV database
 * @returns Promise resolving to a storage implementation
 */
export async function createStorage(path?: string): Promise<IStorageAdapter> {
  return await createDenoKvStorage(path);
} 