import { IStorageAdapter } from "../store/storage_adapter.ts";
import { DenoKvStorage, createDenoKvStorage } from "./deno/kv_storage.ts";

/**
 * 🏭 Factory for creating storage implementations
 */
export class StorageFactory {
  /**
   * Create a Deno KV storage implementation
   * 
   * @param path - Optional path to the KV database
   * @returns Promise resolving to a new DenoKvStorage implementation
   */
  static async createDenoKvStorage(path?: string): Promise<IStorageAdapter> {
    return await createDenoKvStorage(path);
  }
  
  /**
   * Create a Deno KV storage implementation with an existing KV instance
   * 
   * @param kv - Deno KV instance
   * @returns A new DenoKvStorage implementation
   */
  static createDenoKvStorageWithInstance(kv: Deno.Kv): IStorageAdapter {
    return new DenoKvStorage(kv);
  }
} 