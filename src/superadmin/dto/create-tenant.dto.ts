import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString({ message: 'Tenant name must be a string' })
  @IsNotEmpty({ message: 'Tenant name is required' })
  name: string;

  @IsString({ message: 'Slug must be a string' })
  @IsNotEmpty({ message: 'Slug is required' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must only contain lowercase alphanumeric characters and hyphens (kebab-case)',
  })
  slug: string;

  @IsString({ message: 'Vertical/industry is required' })
  @IsNotEmpty({ message: 'Vertical cannot be empty' })
  vertical: string;

  @IsEmail({}, { message: 'Owner email must be a valid email address' })
  @IsNotEmpty({ message: 'Owner email is required' })
  ownerEmail: string;

  @IsOptional()
  settings?: Record<string, any>;
}
