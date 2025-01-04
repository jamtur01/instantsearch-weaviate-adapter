import weaviate, { WeaviateClient, WhereFilter, ApiKey } from "weaviate-ts-client";
import {
  WeaviateAdapterOptions,
  SearchResponse,
  SearchRequest,
  FilterOperator,
} from "./types";

export class WeaviateSearchAdapter {
  private client: WeaviateClient;
  private options: WeaviateAdapterOptions;

  constructor(options: WeaviateAdapterOptions) {
    this.options = options;
    this.client = weaviate.client({
      scheme: new URL(options.weaviateUrl).protocol.replace(":", ""),
      host: new URL(options.weaviateUrl).host,
      ...(options.apiKey && { apiKey: new ApiKey(options.apiKey) }),
    });
  }

  async search(requests: SearchRequest[]): Promise<{ results: SearchResponse[] }> {
    const results = await Promise.all(
      requests.map(async (request) => {
        const startTime = Date.now();
        const { params } = request;

        const query = this.client.graphql
          .get()
          .withClassName(this.options.className);

        // Add fields to retrieve
        const fields = this.options.fields || [
          "title description price _additional { id distance }",
        ];
        query.withFields(fields.join(" "));

        // Handle search parameters
        if (params.hybrid && params.query) {
          // Hybrid search combines BM25 with vector search
          query.withHybrid({
            query: params.query,
            alpha: 0.5, // Equal weight between BM25 and vector search
          });
        } else if (params.query) {
          // BM25 text search
          query.withBm25({
            query: params.query,
          });
        }

        // Handle vector search parameters
        if (params.nearText) {
          query.withNearText(params.nearText);
        }

        if (params.nearObject) {
          query.withNearObject(params.nearObject);
        }

        // Handle pagination
        const limit = params.hitsPerPage || 20;
        const offset = (params.page || 0) * limit;
        query.withLimit(limit).withOffset(offset);

        // Handle sorting
        if (params.sortBy && params.sortBy.length > 0) {
          const sortArgs = params.sortBy.map((sort) => ({
            path: [sort.property],
            order: sort.order || "asc",
          }));
          query.withSort(sortArgs);
        }

        // Handle filters if present
        if (params.filters) {
          const whereFilter = this.parseFilters(params.filters);
          if (whereFilter) {
            query.withWhere(whereFilter);
          }
        }

        try {
          // Get total count for pagination
          const countQuery = this.client.graphql
            .aggregate()
            .withClassName(this.options.className)
            .withFields('meta { count }');

          // Apply the same filters to count query
          if (params.filters) {
            const whereFilter = this.parseFilters(params.filters);
            if (whereFilter) {
              countQuery.withWhere(whereFilter);
            }
          }

          // Execute main query and count query in parallel
          const [response, countResponse] = await Promise.all([
            query.do(),
            countQuery.do(),
          ]);

          const hits = response.data.Get[this.options.className] || [];
          const totalCount = countResponse.data.Aggregate[this.options.className][0]?.meta?.count || 0;

          return {
            hits: hits.map((hit: any) => ({
              ...hit,
              _score: hit._additional?.distance
                ? 1 - hit._additional.distance
                : null,
            })),
            nbHits: hits.length,
            page: params.page || 0,
            nbPages: Math.ceil(totalCount / limit),
            hitsPerPage: limit,
            processingTimeMS: Date.now() - startTime,
            query: params.query || "",
          };
        } catch (error) {
          console.error("Weaviate search error:", error);
          throw error;
        }
      })
    );

    return { results };
  }

  private parseFilterValue(value: string): { operator: FilterOperator; value: any } {
    if (value.startsWith(">=")) {
      return {
        operator: "GreaterThanEqual",
        value: parseFloat(value.substring(2)),
      };
    } else if (value.startsWith("<=")) {
      return {
        operator: "LessThanEqual",
        value: parseFloat(value.substring(2)),
      };
    } else if (value.startsWith(">")) {
      return {
        operator: "GreaterThan",
        value: parseFloat(value.substring(1)),
      };
    } else if (value.startsWith("<")) {
      return {
        operator: "LessThan",
        value: parseFloat(value.substring(1)),
      };
    } else if (value === "null") {
      return {
        operator: "IsNull",
        value: true,
      };
    } else if (value.includes("*")) {
      return {
        operator: "Like",
        value: value,
      };
    } else {
      return {
        operator: "Equal",
        value: value,
      };
    }
  }

  private createWhereFilter(
    field: string,
    operator: FilterOperator,
    value: any
  ): WhereFilter {
    const filter: WhereFilter = {
      path: [field],
      operator: operator,
    };

    if (typeof value === "number") {
      filter.valueNumber = value;
    } else if (typeof value === "string") {
      filter.valueString = value;
    } else if (Array.isArray(value)) {
      filter.valueString = value.join(',');
    }

    return filter;
  }

  private parseAndGroup(group: string): WhereFilter {
    const conditions = group.split(' AND ');
    
    if (conditions.length === 1) {
      const [field, value] = conditions[0].split(':');
      const { operator, value: parsedValue } = this.parseFilterValue(value);
      return this.createWhereFilter(field, operator, parsedValue);
    }

    return {
      operator: 'And',
      operands: conditions.map(condition => {
        const [field, value] = condition.split(':');
        const { operator, value: parsedValue } = this.parseFilterValue(value);
        return this.createWhereFilter(field, operator, parsedValue);
      }),
    };
  }

  private parseFilters(filterString: string): WhereFilter | null {
    try {
      // Split by OR first
      const orGroups = filterString.split(' OR ');
      
      if (orGroups.length > 1) {
        return {
          operator: 'Or',
          operands: orGroups.map(group => this.parseAndGroup(group)),
        };
      }
      
      return this.parseAndGroup(filterString);
    } catch (error) {
      console.error("Filter parsing error:", error);
      return null;
    }
  }
}
