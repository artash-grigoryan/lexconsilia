import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService } from './chromadb.service';
import { OllamaService } from './ollama.service';
import { DocumentProcessorService } from './document-processor.service';
import { IDocumentMetadata } from '../../interfaces/IDocument';
import { IQueryRequest } from '../../interfaces/IQueryRequest';
import { IQueryResponse, ISource } from '../../interfaces/IQueryResponse';
import { IIndexResponse } from '../../interfaces/IIndexResponse';
import { DocumentType } from '../../constants/DocumentType.enum';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly chromaDBService: ChromaDBService,
    private readonly ollamaService: OllamaService,
    private readonly documentProcessor: DocumentProcessorService,
  ) {}

  async indexDocument(
    content: string,
    type: DocumentType,
    metadata?: IDocumentMetadata,
  ): Promise<IIndexResponse> {
    try {
      const document = this.documentProcessor.processText(
        content,
        type,
        metadata,
      );

      // Check for duplicates
      const exists = await this.chromaDBService.checkDocumentExists(
        document.hash,
      );

      if (exists) {
        this.logger.warn(
          `Document with hash ${document.hash} already exists. Skipping.`,
        );
        return {
          success: true,
          documentsIndexed: 0,
          duplicatesSkipped: 1,
        };
      }

      // Chunk the document for better retrieval with LangChain
      const chunks = await this.documentProcessor.chunkDocument(document);

      // Add to vector database
      const ids = await this.chromaDBService.addDocuments(chunks);

      return {
        success: true,
        documentsIndexed: chunks.length,
        duplicatesSkipped: 0,
        documentIds: ids,
      };
    } catch (error) {
      this.logger.error('Failed to index document', error);
      return {
        success: false,
        documentsIndexed: 0,
        duplicatesSkipped: 0,
        errors: [error.message],
      };
    }
  }

  async indexPDF(
    buffer: Buffer,
    metadata?: IDocumentMetadata,
  ): Promise<IIndexResponse> {
    try {
      const document = await this.documentProcessor.processPDF(
        buffer,
        metadata,
      );

      // Check for duplicates
      const exists = await this.chromaDBService.checkDocumentExists(
        document.hash,
      );

      if (exists) {
        this.logger.warn(
          `PDF with hash ${document.hash} already exists. Skipping.`,
        );
        return {
          success: true,
          documentsIndexed: 0,
          duplicatesSkipped: 1,
        };
      }

      // Chunk the document with LangChain
      const chunks = await this.documentProcessor.chunkDocument(document);

      // Add to vector database
      const ids = await this.chromaDBService.addDocuments(chunks);

      return {
        success: true,
        documentsIndexed: chunks.length,
        duplicatesSkipped: 0,
        documentIds: ids,
      };
    } catch (error) {
      this.logger.error('Failed to index PDF', error);
      return {
        success: false,
        documentsIndexed: 0,
        duplicatesSkipped: 0,
        errors: [error.message],
      };
    }
  }

  async indexMultipleDocuments(
    documents: Array<{
      content: string;
      type: DocumentType;
      metadata?: IDocumentMetadata;
    }>,
  ): Promise<IIndexResponse> {
    const results: IIndexResponse = {
      success: true,
      documentsIndexed: 0,
      duplicatesSkipped: 0,
      errors: [],
      documentIds: [],
    };

    for (const doc of documents) {
      const result = await this.indexDocument(
        doc.content,
        doc.type,
        doc.metadata,
      );

      results.documentsIndexed += result.documentsIndexed;
      results.duplicatesSkipped += result.duplicatesSkipped;

      if (result.errors && result.errors.length > 0 && results.errors) {
        results.errors.push(...result.errors);
        results.success = false;
      }

      if (result.documentIds && results.documentIds) {
        results.documentIds.push(...result.documentIds);
      }
    }

    return results;
  }

  async query(request: IQueryRequest): Promise<IQueryResponse> {
    try {
      const maxResults = request.maxResults || 5;

      // Step 1: Retrieve relevant documents from vector DB
      const retrievalResults = await this.chromaDBService.queryDocuments(
        request.query,
        maxResults,
      );

      if (!retrievalResults.ids[0] || retrievalResults.ids[0].length === 0) {
        return {
          answer:
            'I did not find any relevant documents to answer your question.',
          sources: [],
        };
      }

      // Step 2: Prepare context from retrieved documents
      const context = this.buildContext(retrievalResults);

      // Step 3: Generate response using Ollama
      const answer = await this.ollamaService.generateResponse(
        request.query,
        context,
        request.type,
      );

      // Step 4: Prepare sources
      const sources: ISource[] = this.buildSources(retrievalResults);

      return {
        answer,
        sources,
      };
    } catch (error) {
      this.logger.error('Failed to process query', error);
      throw error;
    }
  }

  async analyzeDocument(
    buffer: Buffer,
    query?: string,
  ): Promise<IQueryResponse> {
    try {
      // Process the document
      const document = await this.documentProcessor.processPDF(buffer);

      // Use the document content as context
      const context = document.content;

      // Generate analysis
      const defaultQuery =
        query ||
        'Provide a comprehensive summary of this legal document, including key points, involved parties, and legal implications.';

      const answer = await this.ollamaService.generateResponse(
        defaultQuery,
        context.substring(0, 10000), // Limit context size
        query ? this.inferQueryType(query) : ('SUMMARY' as any),
      );

      return {
        answer,
        sources: [
          {
            documentId: 'uploaded_document',
            title: document.metadata.title || 'Uploaded document',
            excerpt: context.substring(0, 500) + '...',
            similarity: 1.0,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Failed to analyze document', error);
      throw error;
    }
  }

  private buildContext(retrievalResults: any): string {
    const documents = retrievalResults.documents[0] || [];
    const metadatas = retrievalResults.metadatas[0] || [];

    let context = '';
    const MAX_CONTEXT_LENGTH = 2000; // Limite stricte pour éviter les timeouts

    for (let index = 0; index < documents.length; index++) {
      const doc = documents[index];
      const metadata = metadatas[index];
      const title = metadata?.title || 'Untitled document';

      // Limiter chaque document à 500 caractères max
      const truncatedDoc =
        doc.length > 500 ? doc.substring(0, 500) + '...' : doc;

      const docSection = `\n--- Document: ${title} ---\n${truncatedDoc}\n`;

      // Arrêter si on dépasse la limite totale
      if (context.length + docSection.length > MAX_CONTEXT_LENGTH) {
        this.logger.warn(
          `Context limit reached (${MAX_CONTEXT_LENGTH} chars), using ${index} out of ${documents.length} documents`,
        );
        break;
      }

      context += docSection;
    }

    this.logger.log(
      `Built context: ${context.length} chars from ${documents.length} documents`,
    );
    return context;
  }

  private buildSources(retrievalResults: any): ISource[] {
    const ids = retrievalResults.ids[0] || [];
    const documents = retrievalResults.documents[0] || [];
    const metadatas = retrievalResults.metadatas[0] || [];
    const distances = retrievalResults.distances[0] || [];

    return ids.map((id: string, index: number) => ({
      documentId: id,
      title: metadatas[index]?.title || 'Untitled document',
      excerpt:
        documents[index]?.substring(0, 300) + '...' || 'No excerpt available',
      similarity: 1 - (distances[index] || 0), // Convert distance to similarity
    }));
  }

  private inferQueryType(query: string): any {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes('summary') ||
      lowerQuery.includes('summarize') ||
      lowerQuery.includes('overview') ||
      lowerQuery.includes('synthesis') ||
      lowerQuery.includes('résumé') ||
      lowerQuery.includes('résumer') ||
      lowerQuery.includes('sommaire') ||
      lowerQuery.includes('synthèse')
    ) {
      return 'SUMMARY';
    }

    if (
      lowerQuery.includes('analyze') ||
      lowerQuery.includes('analysis') ||
      lowerQuery.includes('examine') ||
      lowerQuery.includes('evaluate') ||
      lowerQuery.includes('analyser') ||
      lowerQuery.includes('analyse') ||
      lowerQuery.includes('examiner') ||
      lowerQuery.includes('évaluer')
    ) {
      return 'ANALYSIS';
    }

    return 'QUESTION';
  }

  async getStats(): Promise<any> {
    return await this.chromaDBService.getCollectionStats();
  }
}
