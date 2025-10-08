import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './services/rag.service';
import { ChromaDBService } from './services/chromadb.service';
import { OllamaService } from './services/ollama.service';
import { DocumentProcessorService } from './services/document-processor.service';
import { ItalianEmbeddingsService } from './services/italian-embeddings.service';

@Module({
  controllers: [RagController],
  providers: [
    RagService,
    ChromaDBService,
    OllamaService,
    DocumentProcessorService,
    ItalianEmbeddingsService,
  ],
  exports: [RagService],
})
export class RagModule {}
