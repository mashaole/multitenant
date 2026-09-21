import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxSessionsPerUser?: number;
}

export class PutModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleKeys!: string[];
}

export class PatchSettingsDto {
  @IsInt()
  @Min(1)
  @Max(20)
  maxSessionsPerUser!: number;
}

export class CreateUserDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(120)
  email!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;
}

export class IdParamDto {
  @IsUUID()
  id!: string;
}
