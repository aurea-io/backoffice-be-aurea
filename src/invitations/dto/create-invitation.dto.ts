import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Email address must be valid' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @IsEnum(Role, { message: 'Role must be a valid role (OWNER, MANAGER, STAFF, CASHIER, SUPERADMIN)' })
  @IsOptional()
  role?: Role = Role.STAFF;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  daysValid?: number = 7;
}
