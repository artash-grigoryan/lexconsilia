import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentTypesEnum } from '../../constants/document-types.enum';

export class IndexDocumentDto {
  @ApiProperty({
    description: 'Contenu du document juridique',
    example:
      'Article 1: Les conventions légalement formées tiennent lieu de loi...',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Type de document juridique',
    enum: DocumentTypesEnum,
    example: DocumentTypesEnum.LAW,
  })
  @IsEnum(DocumentTypesEnum)
  type: DocumentTypesEnum;

  @ApiPropertyOptional({
    description: 'Métadonnées du document',
    example: {
      title: 'Code Civil - Article 1',
      author: 'République Française',
      date: '2024-01-01',
      source: 'Légifrance',
      tags: ['droit civil', 'contrats'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    title?: string;
    author?: string;
    date?: Date;
    source?: string;
    tags?: string[];
    [key: string]: any;
  };
}
