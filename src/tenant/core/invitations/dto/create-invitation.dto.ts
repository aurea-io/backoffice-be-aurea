import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail({}, { message: 'Email address must be valid' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @IsEnum(Role, { message: 'Role must be a valid tenant role (OWNER, MANAGER, STAFF, CASHIER)' })
  @IsOptional()
  role?: Role = Role.STAFF;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  daysValid?: number = 7;
}
