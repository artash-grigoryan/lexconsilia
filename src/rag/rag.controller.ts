import {
  Controller,
  Post,
  Body,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { RagService } from './services/rag.service';
import { IndexDocumentDto } from './dto/IndexDocumentDto';
import { QueryDto } from './dto/QueryDto';
import { IQueryResponse } from '../interfaces/IQueryResponse';
import { IIndexResponse } from '../interfaces/IIndexResponse';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index/text')
  @ApiTags('indexation')
  @ApiOperation({
    summary: 'Indexer un document texte',
    description:
      'Indexe un document juridique dans la base vectorielle. ' +
      'Le système détecte automatiquement les doublons et découpe le document en chunks.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document indexé avec succès',
    schema: {
      example: {
        success: true,
        documentsIndexed: 5,
        duplicatesSkipped: 0,
        documentIds: ['doc_123_abc', 'doc_123_def'],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  async indexTextDocument(
    @Body() indexDocumentDto: IndexDocumentDto,
  ): Promise<IIndexResponse> {
    return await this.ragService.indexDocument(
      indexDocumentDto.content,
      indexDocumentDto.type,
      indexDocumentDto.metadata,
    );
  }

  @Post('index/pdf')
  @ApiTags('indexation')
  @ApiOperation({
    summary: 'Indexer un fichier PDF',
    description:
      'Indexe un document PDF juridique. Le texte est extrait automatiquement ' +
      'et le document est découpé en chunks pour une meilleure recherche.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier PDF à indexer',
        },
        metadata: {
          type: 'string',
          description: 'Métadonnées au format JSON',
          example: '{"title":"Décision de justice","type":"JURISPRUDENCE"}',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'PDF indexé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide ou manquant',
  })
  @UseInterceptors(FileInterceptor('file'))
  async indexPDF(
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadataString?: string,
  ): Promise<IIndexResponse> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Le fichier doit être un PDF');
    }

    const metadata = metadataString ? JSON.parse(metadataString) : undefined;

    return await this.ragService.indexPDF(file.buffer, metadata);
  }

  @Post('index/pdfs')
  @ApiTags('indexation')
  @ApiOperation({
    summary: 'Indexer plusieurs PDFs',
    description:
      'Indexe plusieurs fichiers PDF en une seule requête (maximum 10 fichiers).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Fichiers PDF à indexer (max 10)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'PDFs indexés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Fichiers invalides ou manquants',
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async indexMultiplePDFs(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<IIndexResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const results: IIndexResponse = {
      success: true,
      documentsIndexed: 0,
      duplicatesSkipped: 0,
      errors: [],
      documentIds: [],
    };

    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        if (results.errors) {
          results.errors.push(`${file.originalname} n'est pas un PDF`);
        }
        continue;
      }

      const result = await this.ragService.indexPDF(file.buffer);
      results.documentsIndexed += result.documentsIndexed;
      results.duplicatesSkipped += result.duplicatesSkipped;

      if (result.errors && result.errors.length > 0) {
        if (results.errors) {
          results.errors.push(...result.errors);
        }
        results.success = false;
      }

      if (result.documentIds && results.documentIds) {
        results.documentIds.push(...result.documentIds);
      }
    }

    return results;
  }

  @Post('query')
  @ApiTags('consultation')
  @ApiOperation({
    summary: 'Consulter le système RAG',
    description:
      'Pose une question au système RAG. Le système recherche les documents ' +
      "pertinents dans la base vectorielle et génère une réponse avec l'IA.",
  })
  @ApiResponse({
    status: 200,
    description: 'Réponse générée avec succès',
    schema: {
      example: {
        answer:
          "Les conditions de validité d'un contrat sont définies par l'article 1128 du Code Civil...",
        sources: [
          {
            documentId: 'doc_123_abc',
            title: 'Code Civil - Article 1128',
            excerpt: "Sont nécessaires à la validité d'un contrat...",
            similarity: 0.95,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide',
  })
  async query(@Body() queryDto: QueryDto): Promise<IQueryResponse> {
    return await this.ragService.query({
      query: queryDto.query,
      type: queryDto.type,
      context: queryDto.context,
      maxResults: queryDto.maxResults,
    });
  }

  @Post('analyze/pdf')
  @ApiTags('consultation')
  @ApiOperation({
    summary: 'Analyser un PDF sans indexation',
    description:
      "Analyse un document PDF à la volée sans l'indexer dans la base. " +
      'Utile pour obtenir un résumé ou poser une question sur un document ponctuel.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier PDF à analyser',
        },
        query: {
          type: 'string',
          description: 'Question optionnelle sur le document',
          example: 'Résume les points clés de cette décision de justice',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Analyse générée avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide ou manquant',
  })
  @UseInterceptors(FileInterceptor('file'))
  async analyzePDF(
    @UploadedFile() file: Express.Multer.File,
    @Body('query') query?: string,
  ): Promise<IQueryResponse> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Le fichier doit être un PDF');
    }

    return await this.ragService.analyzeDocument(file.buffer, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Statistiques du système',
    description:
      'Récupère les statistiques de la base vectorielle (nombre de documents, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    schema: {
      example: {
        collectionName: 'legal_documents',
        documentCount: 1523,
      },
    },
  })
  async getStats(): Promise<any> {
    return await this.ragService.getStats();
  }
}
