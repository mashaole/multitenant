import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum QuestionTypeDto {
  RATING = 'RATING',
  YES_NO = 'YES_NO',
}

export class CreateQuestionDto {
  @IsString()
  @MaxLength(200)
  text!: string;

  @IsEnum(QuestionTypeDto)
  type!: QuestionTypeDto;

  @IsInt()
  @Min(1)
  position!: number;
}

export class CreateSurveyDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
