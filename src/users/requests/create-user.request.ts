import { IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserRequest {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsOptional()
  roles: Role[];
}
