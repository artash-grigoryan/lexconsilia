import { QueryTypesEnum } from '../constants/query-types.enum';

export interface IQueryRequest {
  query: string;
  type: QueryTypesEnum;
  context?: string;
  maxResults?: number;
}
