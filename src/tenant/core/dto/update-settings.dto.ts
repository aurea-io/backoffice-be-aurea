import { IsOptional, IsString } from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  settings?: {
    brandColor?: string;
    primaryColor?: string;
    accentColor?: string;
    textColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    coverUrl?: string;
    description?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    socialLinks?: {
      instagram?: string;
      facebook?: string;
      website?: string;
    };
    schedule?: Record<string, { open: string; close: string; closed?: boolean }>;
    [key: string]: any;
  };
}
