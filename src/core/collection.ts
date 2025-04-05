import { CognitiveResource } from "./resource.ts";

/**
 * 📚 Represents a collection of Cognitive Resources.
 * Extends CognitiveResource and adds collection-specific properties and methods.
 * Based on Section 4.7 and 6.2 of the white paper.
 */
export class CognitiveCollection extends CognitiveResource {
  private _itemType: string;
  private _items: CognitiveResource[];
  // Placeholders for future features
  private _pagination?: PaginationInfo;
  private _filters?: Record<string, unknown>;
  private _aggregates?: Record<string, unknown>;

  /**
   * ⚙️ Creates a new CognitiveCollection instance.
   * @param config - Configuration for the collection.
   * @param config.id - The unique identifier for the collection.
   * @param config.itemType - The type of items the collection holds.
   * @param config.items - Optional initial array of items.
   */
  constructor(config: {
    id: string;
    itemType: string;
    items?: CognitiveResource[];
  }) {
    // Call the parent constructor
    super({
      id: config.id,
      type: "collection", // Fixed type for collections
      properties: { itemType: config.itemType }, // Store itemType as a property
    });

    this._itemType = config.itemType;
    this._items = config.items || [];
    // Initialize other properties as needed
  }

  /**
   * ⚙️ Sets the pagination information for the collection.
   * @param info - The pagination information object.
   * @returns The current CognitiveCollection instance for chaining.
   */
  setPagination(info: PaginationInfo): CognitiveCollection {
    this._pagination = info;
    return this;
  }

  /**
   * ⚙️ Sets the filter criteria associated with the collection's current view.
   * @param filters - An object representing the applied filters.
   * @returns The current CognitiveCollection instance for chaining.
   */
  setFilters(filters: Record<string, unknown>): CognitiveCollection {
    this._filters = filters;
    return this;
  }

  /**
   * ⚙️ Sets the aggregate data associated with the collection's current view.
   * @param aggregates - An object containing aggregate calculations (e.g., counts, sums, averages).
   * @returns The current CognitiveCollection instance for chaining.
   */
  setAggregates(aggregates: Record<string, unknown>): CognitiveCollection {
    this._aggregates = aggregates;
    return this;
  }

  /**
   * ⚙️ Adds a resource item to the collection.
   * @param item - The CognitiveResource to add.
   * @returns The current CognitiveCollection instance for chaining.
   */
  addItem(item: CognitiveResource): CognitiveCollection {
    // Optional: Could add a check here to ensure item._type matches this._itemType
    this._items.push(item);
    return this;
  }

  /**
   * ✨ Gets the items currently in the collection.
   * @returns A shallow copy of the items array.
   */
  getItems(): CognitiveResource[] {
    return [...this._items]; // Return a copy
  }

  /**
   * ✨ Serializes the collection to a plain JSON object.
   * Overrides the parent toJSON to include collection-specific properties.
   * @returns A JSON representation of the collection.
   */
  override toJSON(): Record<string, unknown> {
    // Start with the base resource serialization (includes _id, _type, itemType, _actions etc.)
    const baseJson = super.toJSON();

    // Add collection-specific properties
    const result = {
      ...baseJson,
      items: this._items.map(item => item.toJSON()), // Serialize each item
      pagination: this._pagination,
      filters: this._filters,
      aggregates: this._aggregates,
    };

    // Remove extensions if they are empty (handled by super.toJSON for _actions etc.)
    // Explicitly remove collection ones if they are added and empty later
    if (!result.pagination) delete result.pagination;
    if (!result.filters || Object.keys(result.filters).length === 0) delete result.filters;
    if (!result.aggregates || Object.keys(result.aggregates).length === 0) delete result.aggregates;

    return result;
  }
}

// --- Future Type Definitions (Placeholder) ---

/**
 * ⚙️ Pagination information for a collection.
 * Based on Section 4.7 of the white paper.
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
} 