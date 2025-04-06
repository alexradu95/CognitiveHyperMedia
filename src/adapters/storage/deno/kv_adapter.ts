
/**
 * 🔌 Deno KV implementation of the storage adapter
 * 
 * @implements IStorageAdapter
 */
export class DenoKvAdapter implements IStorageAdapter {
  private kv: Deno.Kv;
  
  /**
   * Create a new DenoKvAdapter
   * 
   * @param kv - Deno KV instance
   */
  constructor(kv: Deno.Kv) {
    this.kv = kv;
  }
  
  /**
   * Create a new record in Deno KV
   */
  async create(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    const key = [type, id];
    await this.kv.set(key, data);
  }
  
  /**
   * Retrieve a record from Deno KV
   */
  async get(type: string, id: string): Promise<Record<string, unknown> | null> {
    const key = [type, id];
    const result = await this.kv.get<Record<string, unknown>>(key);
    return result.value;
  }
  
  /**
   * Update an existing record in Deno KV
   */
  async update(type: string, id: string, data: Record<string, unknown>): Promise<void> {
    const key = [type, id];
    await this.kv.set(key, data);
  }
  
  /**
   * Delete a record from Deno KV
   */
  async delete(type: string, id: string): Promise<void> {
    const key = [type, id];
    await this.kv.delete(key);
  }
  
  /**
   * List records of a specific type from Deno KV
   */
  async list(type: string, options?: {
    filter?: Record<string, unknown>,
    page?: number,
    pageSize?: number
  }): Promise<{
    items: Array<Record<string, unknown>>;
    totalItems: number;
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 10;
    const filter = options?.filter || {};
    
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
    
    // Sort by createdAt (descending)
    items.sort((a, b) => {
      const aCreatedAt = a.createdAt as string;
      const bCreatedAt = b.createdAt as string;
      return aCreatedAt && bCreatedAt ? aCreatedAt.localeCompare(bCreatedAt) : 0;
    });
    
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
} 