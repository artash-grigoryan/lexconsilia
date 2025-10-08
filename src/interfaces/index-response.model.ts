export interface IIndexResponse {
  success: boolean;
  documentsIndexed: number;
  duplicatesSkipped: number;
  errors?: string[];
  documentIds?: string[];
}
