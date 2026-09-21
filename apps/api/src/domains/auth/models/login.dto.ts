import { IsUUID } from 'class-validator';

export class LoginDto {
  @IsUUID()
  userId!: string;
}
