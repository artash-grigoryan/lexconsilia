import { DocumentTypesEnum } from '../constants/document-types.enum';

export interface IDocument {
  id: string;
  content: string;
  type: DocumentTypesEnum;
  metadata: IDocumentMetadata;
  hash: string;
  createdAt: Date;
}

export interface IDocumentMetadata {
  title?: string;
  author?: string;
  date?: Date;
  source?: string;
  tags?: string[];
  [key: string]: any;
}
