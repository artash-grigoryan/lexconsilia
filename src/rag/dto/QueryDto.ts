import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueryTypesEnum } from '../../constants/query-types.enum';

export class QueryDto {
  @ApiProperty({
    description: 'Domanda o richiesta da porre al sistema RAG',
    example: 'Quali sono le condizioni di validità di un contratto?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Tipo di richiesta',
    enum: QueryTypesEnum,
    example: QueryTypesEnum.QUESTION,
  })
  @IsEnum(QueryTypesEnum)
  type: QueryTypesEnum;

  @ApiPropertyOptional({
    description: 'Numero massimo di documenti da recuperare',
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
