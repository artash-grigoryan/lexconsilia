import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChromaClient, Collection } from 'chromadb';
import { IDocument } from '../../interfaces/document.model';
import { ItalianEmbeddingsService } from './italian-embeddings.service';

@Injectable()
export class ChromaDBService implements OnModuleInit {
  private readonly logger = new Logger(ChromaDBService.name);
  private client: ChromaClient;
  private collection: Collection;
  private readonly collectionName = 'legal_documents_italian';

  constructor(private readonly italianEmbeddings: ItalianEmbeddingsService) {}

  async onModuleInit() {
    try {
      this.client = new ChromaClient({
        path: process.env.CHROMADB_URL || 'http://localhost:8000',
      });

      // Get or create collection avec embeddings Italian-Legal-BERT (768 dimensions)
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description:
            'Italian legal documents with Italian-Legal-BERT embeddings (768 dimensions)',
          'hnsw:space': 'cosine',
        },
      });

      this.logger.log(
        `🇮🇹 ChromaDB collection "${this.collectionName}" initialized with Italian-Legal-BERT (768 dims)`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize ChromaDB', error);
      throw error;
    }
  }

  async addDocuments(documents: IDocument[]): Promise<string[]> {
    try {
      const ids = documents.map((doc) => doc.id);
      const metadatas = documents.map((doc) => ({
        type: doc.type,
        hash: doc.hash,
        createdAt: doc.createdAt.toISOString(),
        title: doc.metadata.title || '',
        author: doc.metadata.author || '',
        source: doc.metadata.source || '',
        tags: doc.metadata.tags?.join(',') || '',
      }));
      const documents_content = documents.map((doc) => doc.content);

      // Générer les embeddings avec Italian-Legal-BERT (768 dimensions)
      this.logger.log(
        `🇮🇹 Generating Italian-Legal-BERT embeddings for ${documents_content.length} documents...`,
      );

      const generatedEmbeddings =
        await this.italianEmbeddings.generateEmbeddings(documents_content);

      if (!generatedEmbeddings) {
        throw new Error(
          'Italian-Legal-BERT service unavailable. Please check Docker container: lexconsilia-italian-bert',
        );
      }

      this.logger.log(
        `✅ Generated ${generatedEmbeddings.length} embeddings (768 dims each)`,
      );

      // Ajouter avec les embeddings Italian-BERT
      await this.collection.add({
        ids,
        metadatas,
        documents: documents_content,
        embeddings: generatedEmbeddings,
      });

      this.logger.log(
        `✅ Added ${documents.length} documents to ChromaDB with Italian-Legal-BERT embeddings`,
      );
      return ids;
    } catch (error) {
      this.logger.error('Failed to add documents to ChromaDB', error);
      throw error;
    }
  }

  async queryDocuments(queryText: string, nResults: number = 5): Promise<any> {
    try {
      // Générer l'embedding de la query avec Italian-Legal-BERT (768 dimensions)
      this.logger.log(
        `🇮🇹 Generating Italian-Legal-BERT embedding for query...`,
      );

      const queryEmbedding =
        await this.italianEmbeddings.generateEmbedding(queryText);

      if (!queryEmbedding) {
        throw new Error(
          'Italian-Legal-BERT service unavailable. Please check Docker container: lexconsilia-italian-bert',
        );
      }

      this.logger.log(`✅ Query embedding generated (768 dims)`);
      this.logger.log(`🔍 Searching in ChromaDB...`);

      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults,
      });

      this.logger.log(
        `✅ Query completed, found ${results.ids[0]?.length || 0} results`,
      );
      return results;
    } catch (error) {
      this.logger.error('Failed to query ChromaDB', error);
      throw error;
    }
  }

  async checkDocumentExists(hash: string): Promise<boolean> {
    try {
      const results = await this.collection.get({
        where: { hash },
      });

      return results.ids.length > 0;
    } catch (error) {
      this.logger.error('Failed to check document existence', error);
      return false;
    }
  }

  async getDocumentByHash(hash: string): Promise<any> {
    try {
      const results = await this.collection.get({
        where: { hash },
      });

      if (results.ids.length > 0) {
        return {
          id: results.ids[0],
          document: results.documents[0],
          metadata: results.metadatas[0],
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get document by hash', error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await this.collection.delete({
        ids: [id],
      });
      this.logger.log(`Deleted document ${id}`);
    } catch (error) {
      this.logger.error('Failed to delete document', error);
      throw error;
    }
  }

  async getCollectionStats(): Promise<any> {
    try {
      const count = await this.collection.count();
      return {
        collectionName: this.collectionName,
        documentCount: count,
      };
    } catch (error) {
      this.logger.error('Failed to get collection stats', error);
      throw error;
    }
  }
}
