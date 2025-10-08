export interface IQueryResponse {
  answer: string;
  sources: ISource[];
  confidence?: number;
}

export interface ISource {
  documentId: string;
  title?: string;
  excerpt: string;
  similarity: number;
}
