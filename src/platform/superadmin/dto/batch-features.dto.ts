import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignFeatureDto } from './assign-feature.dto.js';

export class BatchFeaturesDto {
  @IsArray({ message: 'features must be an array of feature assignment objects' })
  @ValidateNested({ each: true })
  @Type(() => AssignFeatureDto)
  features: AssignFeatureDto[];
}
