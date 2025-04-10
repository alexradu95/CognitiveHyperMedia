import { CognitiveResource, ResourceBuilder } from "./resource.ts";
import { isCollection, isError } from "./types.ts";

/**
 * 📚 Represents a collection of Cognitive Resources.
 * Extends CognitiveResource and adds collection-specific properties and methods.
 * Based on Section 4.7 and 6.2 of the white paper.
 */
export class CognitiveCollection extends CognitiveResource {
  #itemType: string;
  #items: CognitiveResource[];
  #pagination?: PaginationInfo;
  #filters?: Record<string, unknown>;
  #aggregates?: Record<string, unknown>;

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

    this.#itemType = config.itemType;
    this.#items = config.items ?? [];
    
    // Add self link and collection link
    this.addLink({ rel: "self", href: `/${this.getType()}/${this.getId()}` });
    this.addLink({ rel: "items", href: `/${this.#itemType}` });
  }

  /**
   * ✨ Gets the type of items in this collection
   * @returns The item type string
   */
  getItemType(): string {
    return this.#itemType;
  }

  /**
   * ⚙️ Sets the pagination information for the collection.
   * @param info - The pagination information object.
   * @returns The current CognitiveCollection instance for chaining.
   */
  setPagination(info: PaginationInfo): CognitiveCollection {
    this.#pagination = info;
    return this;
  }

  /**
   * ✨ Gets the pagination information for the collection.
   * @returns The pagination information object, or undefined if not set.
   */
  getPagination(): PaginationInfo | undefined {
    return this.#pagination ? { ...this.#pagination } : undefined;
  }

  /**
   * ⚙️ Sets the filter criteria associated with the collection's current view.
   * @param filters - An object representing the applied filters.
   * @returns The current CognitiveCollection instance for chaining.
   */
  setFilters(filters: Record<string, unknown>): CognitiveCollection {
    this.#filters = { ...filters };
    return this;
  }

  /**
   * ✨ Gets the filter criteria for the collection.
   * @returns The filters object, or undefined if not set.
   */
  getFilters(): Record<string, unknown> | undefined {
    return this.#filters ? { ...this.#filters } : undefined;
  }

  /**
   * ⚙️ Sets the aggregate data associated with the collection's current view.
   * @param aggregates - An object containing aggregate calculations (e.g., counts, sums, averages).
   * @returns The current CognitiveCollection instance for chaining.
   */
  setAggregates(aggregates: Record<string, unknown>): CognitiveCollection {
    this.#aggregates = { ...aggregates };
    return this;
  }

  /**
   * ✨ Gets the aggregates for the collection.
   * @returns The aggregates object, or undefined if not set.
   */
  getAggregates(): Record<string, unknown> | undefined {
    return this.#aggregates ? { ...this.#aggregates } : undefined;
  }

  /**
   * ⚙️ Adds a resource item to the collection.
   * @param item - The CognitiveResource to add.
   * @returns The current CognitiveCollection instance for chaining.
   */
  addItem(item: CognitiveResource): CognitiveCollection {
    // Type check to ensure item type matches collection itemType
    if (item.getType() !== this.#itemType) {
      throw new Error(`Item type '${item.getType()}' does not match collection item type '${this.#itemType}'`);
    }
    this.#items.push(item);
    return this;
  }

  /**
   * ✨ Gets the items currently in the collection.
   * @returns A shallow copy of the items array.
   */
  getItems(): CognitiveResource[] {
    return [...this.#items];
  }

  /**
   * ✨ Gets the count of items in the collection
   * @returns The number of items
   */
  getItemCount(): number {
    return this.#items.length;
  }

  /**
   * ✨ Serializes the collection to a plain JSON object.
   * Overrides the parent toJSON to include collection-specific properties.
   * @returns A JSON representation of the collection.
   */
  override toJSON(): Record<string, unknown> {
    // Start with the base resource serialization
    const baseJson = super.toJSON();

    // Add collection-specific properties
    const result: Record<string, unknown> = {
      ...baseJson,
      items: this.#items.map(item => item.toJSON()),
    };

    // Add optional properties if present
    if (this.#pagination) {
      result.pagination = this.#pagination;
    }
    
    if (this.#filters && Object.keys(this.#filters).length > 0) {
      result.filters = this.#filters;
    }
    
    if (this.#aggregates && Object.keys(this.#aggregates).length > 0) {
      result.aggregates = this.#aggregates;
    }

    return result;
  }
}

/**
 * 🏗️ Builder for creating CognitiveCollection instances
 */
export class CollectionBuilder {
  #id: string;
  #itemType: string;
  #items: CognitiveResource[] = [];
  #pagination?: PaginationInfo;
  #filters?: Record<string, unknown>;
  #aggregates?: Record<string, unknown>;

  /**
   * Create a new CollectionBuilder
   * @param id - Collection identifier
   * @param itemType - Type of items in the collection
   */
  constructor(id: string, itemType: string) {
    this.#id = id;
    this.#itemType = itemType;
  }

  /**
   * Add an item to the collection
   */
  item(resource: CognitiveResource): CollectionBuilder {
    if (resource.getType() !== this.#itemType) {
      throw new Error(`Item type '${resource.getType()}' does not match collection item type '${this.#itemType}'`);
    }
    this.#items.push(resource);
    return this;
  }

  /**
   * Add multiple items to the collection
   */
  items(resources: CognitiveResource[]): CollectionBuilder {
    for (const resource of resources) {
      this.item(resource); // This will perform type checking
    }
    return this;
  }

  /**
   * Set pagination information
   */
  pagination(info: PaginationInfo): CollectionBuilder {
    this.#pagination = info;
    return this;
  }

  /**
   * Set filter criteria
   */
  filters(filters: Record<string, unknown>): CollectionBuilder {
    this.#filters = { ...filters };
    return this;
  }

  /**
   * Set aggregate data
   */
  aggregates(aggregates: Record<string, unknown>): CollectionBuilder {
    this.#aggregates = { ...aggregates };
    return this;
  }

  /**
   * Build the CognitiveCollection instance
   */
  build(): CognitiveCollection {
    const collection = new CognitiveCollection({
      id: this.#id,
      itemType: this.#itemType,
      items: this.#items
    });

    if (this.#pagination) {
      collection.setPagination(this.#pagination);
    }

    if (this.#filters) {
      collection.setFilters(this.#filters);
    }

    if (this.#aggregates) {
      collection.setAggregates(this.#aggregates);
    }

    return collection;
  }

  /**
   * Create a CollectionBuilder for the given id and itemType
   */
  static of(id: string, itemType: string): CollectionBuilder {
    return new CollectionBuilder(id, itemType);
  }
}

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