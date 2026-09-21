import { ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissionKeys!: string[];
}
