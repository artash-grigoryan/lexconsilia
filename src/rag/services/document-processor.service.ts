import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { IDocument, IDocumentMetadata } from '../../interfaces/IDocument';
import { DocumentType } from '../../constants/DocumentType.enum';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    // Configuration du text splitter LangChain
    // Séparateurs hiérarchiques pour un découpage intelligent
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000, // Taille en caractères
      chunkOverlap: 200, // Overlap pour préserver le contexte
      separators: [
        '\n\n', // Paragraphes d'abord
        '\n', // Puis lignes
        '. ', // Puis phrases
        '! ',
        '? ',
        '; ',
        ': ',
        ', ',
        ' ', // Mots en dernier recours
        '', // Caractères si vraiment nécessaire
      ],
      lengthFunction: (text: string) => text.length,
    });
    this.logger.log(
      'DocumentProcessorService initialized with LangChain text splitter',
    );
  }

  async processPDF(
    buffer: Buffer,
    metadata?: IDocumentMetadata,
  ): Promise<IDocument> {
    try {
      const pdfData = await pdfParse(buffer);
      const content = pdfData.text;
      const hash = this.generateHash(content);

      const document: IDocument = {
        id: this.generateId(),
        content: content,
        type: DocumentType.PDF,
        metadata: {
          ...metadata,
          title: metadata?.title || pdfData.info?.Title || 'Untitled PDF',
          author: metadata?.author || pdfData.info?.Author,
          pages: pdfData.numpages,
        },
        hash,
        createdAt: new Date(),
      };

      this.logger.log(`Processed PDF document: ${document.id}`);
      return document;
    } catch (error) {
      this.logger.error('Failed to process PDF', error);
      throw error;
    }
  }

  processText(
    text: string,
    type: DocumentType,
    metadata?: IDocumentMetadata,
  ): IDocument {
    try {
      const cleanedText = this.cleanText(text);
      const hash = this.generateHash(cleanedText);

      const document: IDocument = {
        id: this.generateId(),
        content: cleanedText,
        type,
        metadata: metadata || {},
        hash,
        createdAt: new Date(),
      };

      this.logger.log(`Processed text document: ${document.id}`);
      return document;
    } catch (error) {
      this.logger.error('Failed to process text', error);
      throw error;
    }
  }

  private cleanText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ');
    // Remove special characters that might interfere
    cleaned = cleaned.trim();
    return cleaned;
  }

  generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Découpe intelligemment un document en chunks avec LangChain
   * Préserve la structure sémantique (paragraphes, phrases)
   */
  async chunkDocument(
    document: IDocument,
    chunkSize: number = 1000,
    overlap: number = 200,
  ): Promise<IDocument[]> {
    try {
      // Créer un splitter personnalisé si les paramètres diffèrent
      const splitter =
        chunkSize === 1000 && overlap === 200
          ? this.textSplitter
          : new RecursiveCharacterTextSplitter({
              chunkSize,
              chunkOverlap: overlap,
              separators: [
                '\n\n',
                '\n',
                '. ',
                '! ',
                '? ',
                '; ',
                ': ',
                ', ',
                ' ',
                '',
              ],
            });

      // Split avec LangChain - préserve la structure sémantique
      const textChunks = await splitter.createDocuments([document.content]);

      this.logger.log(
        `📄 LangChain splitting: ${document.content.length} chars → ${textChunks.length} chunks`,
      );

      // Convertir les chunks LangChain en IDocument
      const chunks: IDocument[] = textChunks.map((langchainDoc, index) => ({
        id: `${document.id}_chunk_${index}`,
        content: langchainDoc.pageContent,
        type: document.type,
        metadata: {
          ...document.metadata,
          parentDocumentId: document.id,
          chunkIndex: index,
          totalChunks: textChunks.length,
          chunkSize: langchainDoc.pageContent.length,
        },
        hash: this.generateHash(langchainDoc.pageContent),
        createdAt: document.createdAt,
      }));

      this.logger.log(
        `✅ Document ${document.id} split into ${chunks.length} semantic chunks`,
      );

      // Log des tailles de chunks pour debug
      const sizes = chunks.map((c) => c.content.length);
      this.logger.debug(
        `Chunk sizes: min=${Math.min(...sizes)}, max=${Math.max(...sizes)}, avg=${Math.round(sizes.reduce((a, b) => a + b) / sizes.length)}`,
      );

      return chunks;
    } catch (error) {
      this.logger.error('Failed to chunk document with LangChain', error);
      throw error;
    }
  }

  extractMetadataFromContent(content: string): Partial<IDocumentMetadata> {
    // Basic metadata extraction
    const metadata: Partial<IDocumentMetadata> = {};

    // Try to extract date patterns
    const datePattern = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
    const dateMatch = content.match(datePattern);
    if (dateMatch) {
      metadata.date = new Date(dateMatch[1]);
    }

    // Try to extract title (first line or heading)
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
      metadata.title = firstLine;
    }

    return metadata;
  }
}
