import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/http/pagination.dto';

export class ActivityQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
