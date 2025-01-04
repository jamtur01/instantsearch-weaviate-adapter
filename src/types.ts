import { SearchParameters } from 'algoliasearch-helper';
import { WhereFilter } from 'weaviate-ts-client';

export interface WeaviateAdapterOptions {
  weaviateUrl: string;
  className: string;
  apiKey?: string;
  fields?: string[];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
}

export interface SearchResponse {
  hits: any[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

export interface NearTextParams {
  concepts: string[];
  distance?: number;
  moveAwayFrom?: {
    concepts: string[];
    force?: number;
  };
  moveTo?: {
    concepts: string[];
    force?: number;
  };
}

export interface NearObjectParams {
  id: string;
  distance?: number;
}

export interface SortBy {
  property: string;
  order?: 'asc' | 'desc';
}

export interface WeaviateSearchParams {
  query?: string;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  nearText?: NearTextParams;
  nearObject?: NearObjectParams;
  hybrid?: boolean;
  sortBy?: SortBy[];
}

export type SearchRequest = {
  params: Partial<SearchParameters> & WeaviateSearchParams;
};

export type FilterOperator = 
  | 'Equal'
  | 'NotEqual'
  | 'GreaterThan'
  | 'GreaterThanEqual'
  | 'LessThan'
  | 'LessThanEqual'
  | 'Like'
  | 'And'
  | 'Or'
  | 'ContainsAll'
  | 'ContainsAny'
  | 'IsNull'
  | 'WithinGeoRange';

export interface ParsedFilter {
  operator: FilterOperator;
  field?: string;
  value?: any;
  operands?: ParsedFilter[];
}
