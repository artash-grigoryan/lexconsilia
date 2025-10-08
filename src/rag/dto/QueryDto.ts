import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueryType } from '../../constants/QueryType.enum';

export class QueryDto {
  @ApiProperty({
    description: 'Question ou demande à poser au système RAG',
    example: "Quelles sont les conditions de validité d'un contrat?",
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Type de requête',
    enum: QueryType,
    example: QueryType.QUESTION,
  })
  @IsEnum(QueryType)
  type: QueryType;

  @ApiPropertyOptional({
    description: 'Contexte additionnel pour la requête',
    example: 'Dans le cadre du droit commercial français',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Nombre maximum de documents à récupérer',
    minimum: 1,
    maximum: 20,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxResults?: number = 5;
}
