import { IStorageAdapter } from "../store/storage_adapter.ts";
import { DenoKvStorage, createDenoKvStorage } from "./deno/kv_storage.ts";
import { CognitiveStore } from "../store/store.ts";

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

  /**
   * ✨ Create a new CognitiveStore with a Deno KV backend
   * 
   * One-step creation of a store with KV backing
   * 
   * @param path - Optional path to the KV database
   * @returns Promise resolving to a new CognitiveStore
   */
  static async createStore(path?: string): Promise<CognitiveStore> {
    const storage = await this.createDenoKvStorage(path);
    return new CognitiveStore(storage);
  }
} 