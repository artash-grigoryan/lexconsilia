import { QueryType } from '../constants/QueryType.enum';

export interface IQueryRequest {
  query: string;
  type: QueryType;
  context?: string;
  maxResults?: number;
}
