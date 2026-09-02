import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ImportCatalogDto {
  @IsString() @MinLength(1) csv!: string;
  @IsOptional() @IsBoolean() dryRun?: boolean;
}
