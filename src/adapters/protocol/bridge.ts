import { CognitiveStore } from "../../infrastracture/store/store.ts";
import { IProtocolAdapter } from "./protocol_adapter.ts";

/**
 * 🌉 Protocol-agnostic bridge for connecting a CognitiveStore to protocol servers.
 * This bridge supports different protocols through adapters.
 */
export class CognitiveBridge {
  private store: CognitiveStore;
  private adapter: IProtocolAdapter;

  /**
   * Create a new bridge
   * 
   * @param store - The CognitiveStore to connect
   * @param adapter - The protocol adapter to use
   */
  constructor(store: CognitiveStore, adapter: IProtocolAdapter) {
    this.store = store;
    this.adapter = adapter;
  }

  /**
   * 🔄 Connect the bridge to its protocol
   */
  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  /**
   * 🚪 Disconnect the bridge from its protocol
   */
  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  /**
   * 🔍 Explore a resource by URI
   */
  async explore(uri: string): Promise<any> {
    return this.adapter.explore(uri);
  }

  /**
   * ⚡ Perform an action on a resource
   */
  async act(uri: string, action: string, payload?: Record<string, unknown>): Promise<any> {
    return this.adapter.act(uri, action, payload);
  }
  
  /**
   * ➕ Create a new resource
   */
  async create(uri: string, payload: Record<string, unknown>): Promise<any> {
    return this.adapter.create(uri, payload);
  }
}

/**
 * ✨ Creates a bridge connected to a store and protocol adapter
 */
export function createBridge(store: CognitiveStore, adapter: IProtocolAdapter): CognitiveBridge {
  return new CognitiveBridge(store, adapter);
}

export type Bridge = CognitiveBridge; 