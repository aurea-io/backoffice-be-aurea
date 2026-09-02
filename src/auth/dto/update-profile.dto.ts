import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsOptional()
  preferences?: Record<string, unknown>;
}
