declare module 'chromadb' {
  export interface ChromaClientOptions {
    path?: string;
    auth?: {
      provider: string;
      credentials?: string;
      [key: string]: any;
    };
  }

  export interface CollectionMetadata {
    [key: string]: string | number | boolean;
  }

  export interface Metadata {
    [key: string]: string | number | boolean;
  }

  export interface AddParams {
    ids: string[];
    embeddings?: number[][];
    metadatas?: Metadata[];
    documents?: string[];
  }

  export interface QueryResult {
    ids: string[][];
    distances: number[][];
    embeddings: number[][] | null;
    documents: (string | null)[][];
    metadatas: (Metadata | null)[][];
  }

  export interface QueryParams {
    queryTexts?: string[];
    queryEmbeddings?: number[][];
    nResults?: number;
    where?: Metadata;
    whereDocument?: any;
  }

  export interface GetParams {
    ids?: string[];
    where?: Metadata;
    whereDocument?: any;
    limit?: number;
    offset?: number;
  }

  export interface GetResult {
    ids: string[];
    embeddings: number[][] | null;
    documents: (string | null)[];
    metadatas: (Metadata | null)[];
  }

  export interface DeleteParams {
    ids?: string[];
    where?: Metadata;
    whereDocument?: any;
  }

  export class Collection {
    name: string;
    id: string;
    metadata: CollectionMetadata;

    add(params: AddParams): Promise<void>;
    query(params: QueryParams): Promise<QueryResult>;
    get(params?: GetParams): Promise<GetResult>;
    delete(params: DeleteParams): Promise<void>;
    count(): Promise<number>;
    peek(limit?: number): Promise<GetResult>;
    modify(name?: string, metadata?: CollectionMetadata): Promise<void>;
  }

  export class ChromaClient {
    constructor(options?: ChromaClientOptions);

    createCollection(params: {
      name: string;
      metadata?: CollectionMetadata;
    }): Promise<Collection>;

    getOrCreateCollection(params: {
      name: string;
      metadata?: CollectionMetadata;
    }): Promise<Collection>;

    getCollection(params: { name: string }): Promise<Collection>;

    deleteCollection(params: { name: string }): Promise<void>;

    listCollections(): Promise<Collection[]>;

    heartbeat(): Promise<number>;
  }
}
