/**
 * 🧭 NavigationAdapter - Provides traversal capabilities for resource networks
 * 
 * This adapter extends the protocol capabilities with navigation-specific
 * functionality, allowing resources to be traversed as a graph.
 */

import { CognitiveStore } from "../store/store.ts";
import { CognitiveResource, Link } from "../core/resource.ts";
import { ProtocolError } from "./protocol_adapter.ts";

/**
 * 🧭 Provides navigation capabilities through resources as a graph
 */
export class NavigationAdapter {
  private store: CognitiveStore;

  /**
   * ⚙️ Creates a new NavigationAdapter
   * 
   * @param store - The CognitiveStore instance containing resources
   */
  constructor(store: CognitiveStore) {
    this.store = store;
  }

  /**
   * 🔄 Traverses from a resource to related resources using links
   * 
   * @param resourceType - Type of the starting resource
   * @param resourceId - ID of the starting resource
   * @param relation - The link relation to follow (e.g., "parent", "child", "related")
   * @returns Promise with the target resource(s) or null if not found
   * @throws ProtocolError if the starting resource is not found
   */
  async traverse(resourceType: string, resourceId: string, relation: string): Promise<CognitiveResource | CognitiveResource[] | null> {
    // Get the source resource
    const sourceResource = await this.store.get(resourceType, resourceId);
    if (!sourceResource) {
      throw new ProtocolError(`Source resource ${resourceType}/${resourceId} not found`, "not_found", 404);
    }

    // Find all links with the requested relation
    const links = sourceResource.getLinks().filter(link => link.rel === relation);
    
    if (links.length === 0) {
      return null; // No matching links found
    }
    
    // For a single link, return the target resource
    if (links.length === 1) {
      return this.resolveLink(links[0]);
    }
    
    // For multiple links, return an array of target resources
    const resources: CognitiveResource[] = [];
    for (const link of links) {
      const resource = await this.resolveLink(link);
      if (resource) {
        resources.push(resource);
      }
    }
    
    return resources.length > 0 ? resources : null;
  }

  /**
   * 🔍 Finds resources that link to a given resource
   * 
   * @param targetType - Type of the target resource
   * @param targetId - ID of the target resource
   * @param relation - Optional relation type to filter by
   * @returns Promise with an array of resources that link to the target
   */
  async findReferencing(targetType: string, targetId: string, relation?: string): Promise<CognitiveResource[]> {
    // Verify target exists
    const targetResource = await this.store.get(targetType, targetId);
    if (!targetResource) {
      throw new ProtocolError(`Target resource ${targetType}/${targetId} not found`, "not_found", 404);
    }

    // The target URI that other resources would link to
    const targetUri = `/${targetType}/${targetId}`;
    
    // We'll need to implement a search method to find resources with links to our target
    // This is a simple implementation that would need optimization in a real system
    const referencingResources: CognitiveResource[] = [];
    
    // Ideally, we would have an index of links, but for now we'll search through collections
    // This is resource-intensive and would need optimization in a real implementation
    // Get all resource types in the store
    const resourceTypes = await this.store.getResourceTypes();
    
    for (const type of resourceTypes) {
      // Get all resources of this type
      const collection = await this.store.getCollection(type, { pageSize: 100 });
      
      // Filter resources that have a link to our target
      for (const resource of collection.getItems()) {
        const links = resource.getLinks();
        const hasMatchingLink = links.some(link => {
          const matchesTarget = link.href === targetUri;
          return relation ? (matchesTarget && link.rel === relation) : matchesTarget;
        });
        
        if (hasMatchingLink) {
          referencingResources.push(resource);
        }
      }
    }
    
    return referencingResources;
  }

  /**
   * 🔄 Creates a bidirectional link between two resources
   * 
   * @param sourceType - Type of the source resource
   * @param sourceId - ID of the source resource
   * @param targetType - Type of the target resource
   * @param targetId - ID of the target resource
   * @param sourceRel - Relation from source to target (e.g., "parent")
   * @param targetRel - Relation from target to source (e.g., "child")
   * @returns Promise resolving to the updated source resource
   */
  async link(
    sourceType: string, 
    sourceId: string, 
    targetType: string, 
    targetId: string, 
    sourceRel: string, 
    targetRel: string
  ): Promise<CognitiveResource> {
    // Get both resources
    const sourceResource = await this.store.get(sourceType, sourceId);
    const targetResource = await this.store.get(targetType, targetId);
    
    if (!sourceResource) {
      throw new ProtocolError(`Source resource ${sourceType}/${sourceId} not found`, "not_found", 404);
    }
    
    if (!targetResource) {
      throw new ProtocolError(`Target resource ${targetType}/${targetId} not found`, "not_found", 404);
    }
    
    // Add links in both directions
    sourceResource.addLink({
      rel: sourceRel,
      href: `/${targetType}/${targetId}`,
      title: `${sourceRel} ${targetType}`
    });
    
    targetResource.addLink({
      rel: targetRel,
      href: `/${sourceType}/${sourceId}`,
      title: `${targetRel} ${sourceType}`
    });
    
    // Update both resources in the store
    await this.store.update(sourceType, sourceId, sourceResource.toJSON().properties);
    await this.store.update(targetType, targetId, targetResource.toJSON().properties);
    
    return sourceResource;
  }

  /**
   * 🗑️ Removes a link between two resources
   * 
   * @param sourceType - Type of the source resource
   * @param sourceId - ID of the source resource
   * @param targetType - Type of the target resource
   * @param targetId - ID of the target resource
   * @param sourceRel - Optional relation from source to target to remove
   * @returns Promise resolving to the updated source resource
   */
  async unlink(
    sourceType: string, 
    sourceId: string, 
    targetType: string, 
    targetId: string, 
    sourceRel?: string
  ): Promise<CognitiveResource> {
    // Get both resources
    const sourceResource = await this.store.get(sourceType, sourceId);
    const targetResource = await this.store.get(targetType, targetId);
    
    if (!sourceResource) {
      throw new ProtocolError(`Source resource ${sourceType}/${sourceId} not found`, "not_found", 404);
    }
    
    if (!targetResource) {
      throw new ProtocolError(`Target resource ${targetType}/${targetId} not found`, "not_found", 404);
    }
    
    // The target URI that we want to remove
    const targetUri = `/${targetType}/${targetId}`;
    // The source URI that target might reference
    const sourceUri = `/${sourceType}/${sourceId}`;
    
    // Get current links
    const sourceLinks = sourceResource.getLinks();
    const targetLinks = targetResource.getLinks();
    
    // Create new resources without the relevant links
    const newSourceResource = new CognitiveResource({
      id: sourceId,
      type: sourceType,
      properties: sourceResource.toJSON().properties,
      // Only keep links that don't match our criteria
      links: sourceLinks.filter(link => {
        // If sourceRel specified, only remove links with that rel
        if (sourceRel) {
          return !(link.href === targetUri && link.rel === sourceRel);
        }
        // Otherwise remove all links to target
        return link.href !== targetUri;
      })
    });
    
    // Similarly remove links from target to source
    const newTargetResource = new CognitiveResource({
      id: targetId,
      type: targetType,
      properties: targetResource.toJSON().properties,
      // Remove all links pointing back to source
      links: targetLinks.filter(link => link.href !== sourceUri)
    });
    
    // Update both resources in the store
    await this.store.update(sourceType, sourceId, newSourceResource.toJSON().properties);
    await this.store.update(targetType, targetId, newTargetResource.toJSON().properties);
    
    return newSourceResource;
  }

  /**
   * 🏗️ Creates a relationship graph starting from a seed resource
   * 
   * @param seedType - Type of the seed resource
   * @param seedId - ID of the seed resource
   * @param depth - How many levels to traverse (default: 2)
   * @param relations - Optional array of relation types to follow
   * @returns Promise with a graph representation of related resources
   */
  async createGraph(
    seedType: string, 
    seedId: string, 
    depth: number = 2, 
    relations?: string[]
  ): Promise<ResourceGraph> {
    // Verify seed resource exists
    const seedResource = await this.store.get(seedType, seedId);
    if (!seedResource) {
      throw new ProtocolError(`Seed resource ${seedType}/${seedId} not found`, "not_found", 404);
    }

    // Initialize the graph
    const graph: ResourceGraph = {
      nodes: [],
      edges: []
    };
    
    // Keep track of visited nodes to avoid cycles
    const visited = new Set<string>();
    
    // Add the seed node
    graph.nodes.push({
      id: seedResource.getId(),
      type: seedResource.getType(),
      label: this.getResourceLabel(seedResource),
      properties: this.getResourceProperties(seedResource)
    });
    
    // Recursively build the graph
    await this.buildGraphRecursive(
      graph,
      visited,
      seedResource,
      depth,
      1, // current depth
      relations
    );
    
    return graph;
  }

  /**
   * 🔄 Recursively builds a graph by traversing resources and their links
   */
  private async buildGraphRecursive(
    graph: ResourceGraph,
    visited: Set<string>,
    resource: CognitiveResource,
    maxDepth: number,
    currentDepth: number,
    relations?: string[]
  ): Promise<void> {
    // Mark current resource as visited
    const resourceId = resource.getId();
    const resourceKey = `${resource.getType()}/${resourceId}`;
    visited.add(resourceKey);
    
    // If we've reached max depth, stop recursion
    if (currentDepth >= maxDepth) {
      return;
    }
    
    // Get all links from this resource
    const links = resource.getLinks();
    
    // Filter links by relation type if specified
    const relevantLinks = relations 
      ? links.filter(link => relations.includes(link.rel) && link.rel !== 'self')
      : links.filter(link => link.rel !== 'self'); // Exclude self links
    
    // Process each link
    for (const link of relevantLinks) {
      const targetResource = await this.resolveLink(link);
      if (!targetResource) continue;
      
      const targetId = targetResource.getId();
      const targetType = targetResource.getType();
      const targetKey = `${targetType}/${targetId}`;
      
      // Add target node if not already in graph
      if (!visited.has(targetKey)) {
        graph.nodes.push({
          id: targetId,
          type: targetType,
          label: this.getResourceLabel(targetResource),
          properties: this.getResourceProperties(targetResource)
        });
        
        // Add edge
        graph.edges.push({
          source: resourceId,
          target: targetId,
          relation: link.rel
        });
        
        // Recursively process this node
        await this.buildGraphRecursive(
          graph,
          visited,
          targetResource,
          maxDepth,
          currentDepth + 1,
          relations
        );
      } else {
        // Node exists but edge might not - add edge if not a self-reference
        if (resourceId !== targetId) {
          // Check if edge already exists to avoid duplicates
          const edgeExists = graph.edges.some(e => 
            e.source === resourceId && 
            e.target === targetId && 
            e.relation === link.rel
          );
          
          if (!edgeExists) {
            graph.edges.push({
              source: resourceId,
              target: targetId,
              relation: link.rel
            });
          }
        }
      }
    }
  }

  /**
   * ✨ Gets a human-readable label for a resource
   */
  private getResourceLabel(resource: CognitiveResource): string {
    // Try to generate a meaningful label
    const name = resource.getProperty('name') as string;
    const title = resource.getProperty('title') as string;
    const label = resource.getProperty('label') as string;
    
    return name || title || label || `${resource.getType()} ${resource.getId()}`;
  }

  /**
   * 📦 Gets a subset of properties to include in the graph
   */
  private getResourceProperties(resource: CognitiveResource): Record<string, unknown> {
    // Get key properties for display
    const props = resource.toJSON().properties || {};
    
    // Include only basic properties that help with visualization
    const result: Record<string, unknown> = {};
    
    // Include only primitive values and limit the total number
    const keysToInclude = [
      'name', 'title', 'status', 'priority', 'createdAt', 'updatedAt'
    ];
    
    for (const key of keysToInclude) {
      if (key in props) {
        result[key] = props[key];
      }
    }
    
    return result;
  }

  // Private helpers

  /**
   * 🔍 Resolves a link to its target resource
   * 
   * @param link - The link to resolve
   * @returns Promise with the target resource or null if not found
   */
  private async resolveLink(link: Link): Promise<CognitiveResource | null> {
    // Parse the URI to get type and ID
    const href = link.href;
    const parts = href.split('/').filter(Boolean);
    
    if (parts.length !== 2) {
      // Invalid link format
      return null;
    }
    
    const [type, id] = parts;
    return this.store.get(type, id);
  }
}

/**
 * Structure representing a graph of resources and their relationships
 */
export interface ResourceGraph {
  nodes: ResourceNode[];
  edges: ResourceEdge[];
}

/**
 * A node in the resource graph
 */
export interface ResourceNode {
  id: string;
  type: string;
  label?: string;
  properties?: Record<string, unknown>;
}

/**
 * An edge connecting resources in the graph
 */
export interface ResourceEdge {
  source: string; // Resource ID of source
  target: string; // Resource ID of target
  relation: string; // Relation type
  properties?: Record<string, unknown>;
} 