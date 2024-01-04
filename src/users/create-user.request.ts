import { IsOptional, IsString } from 'class-validator';

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
}
