import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsString() roleKey?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
