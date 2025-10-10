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
import { IQueryResponse } from '../interfaces/query-response.model';
import { IIndexResponse } from '../interfaces/index-response.model';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index/text')
  @ApiOperation({
    summary: 'Index a text document',
    description:
      'Indexes a legal document in the vector database. ' +
      'The system automatically detects duplicates and splits the document into chunks.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document successfully indexed',
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
    description: 'Invalid data',
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
  @ApiOperation({
    summary: 'Index a PDF file',
    description:
      'Indexes a legal PDF document. The text is automatically extracted ' +
      'and the document is split into chunks for better search.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to index',
        },
        metadata: {
          type: 'string',
          description: 'Metadata in JSON format',
          example: '{"title":"Court Decision","type":"JURISPRUDENCE"}',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'PDF successfully indexed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing file',
  })
  @UseInterceptors(FileInterceptor('file'))
  async indexPDF(
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadataString?: string,
  ): Promise<IIndexResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('The file must be a PDF');
    }

    const metadata = metadataString ? JSON.parse(metadataString) : undefined;

    return await this.ragService.indexPDF(file.buffer, metadata);
  }

  @Post('index/pdfs')
  @ApiOperation({
    summary: 'Index multiple PDFs',
    description:
      'Indexes multiple PDF files in a single request (maximum 10 files).',
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
          description: 'PDF files to index (max 10)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'PDFs successfully indexed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing files',
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async indexMultiplePDFs(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<IIndexResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No file provided');
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
          results.errors.push(`${file.originalname} is not a PDF`);
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
  @ApiOperation({
    summary: 'Query the RAG system',
    description:
      'Ask a question to the RAG system. The system searches for relevant documents ' +
      'in the vector database and generates an answer with AI.',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer successfully generated',
    schema: {
      example: {
        answer:
          'The conditions for the validity of a contract are defined by Article 1128 of the Civil Code...',
        sources: [
          {
            documentId: 'doc_123_abc',
            title: 'Civil Code - Article 1128',
            excerpt:
              'The following are necessary for the validity of a contract...',
            similarity: 0.95,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  async query(@Body() queryDto: QueryDto): Promise<IQueryResponse> {
    return await this.ragService.query({
      query: queryDto.query,
      type: queryDto.type,
      maxResults: queryDto.maxResults,
    });
  }

  @Post('analyze/pdf')
  @ApiOperation({
    summary: 'Analyze a PDF without indexing',
    description:
      'Analyzes a PDF document on the fly without indexing it in the database. ' +
      'Useful for getting a summary or asking a question about a one-off document.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to analyze',
        },
        query: {
          type: 'string',
          description: 'Optional question about the document',
          example: 'Summarize the key points of this court decision',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis successfully generated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or missing file',
  })
  @UseInterceptors(FileInterceptor('file'))
  async analyzePDF(
    @UploadedFile() file: Express.Multer.File,
    @Body('query') query?: string,
  ): Promise<IQueryResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('The file must be a PDF');
    }

    return await this.ragService.analyzeDocument(file.buffer, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'System statistics',
    description:
      'Retrieves statistics from the vector database (number of documents, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics successfully retrieved',
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
