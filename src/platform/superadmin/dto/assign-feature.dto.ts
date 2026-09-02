import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class AssignFeatureDto {
  @IsString({ message: 'featureKey must be a string' })
  @IsNotEmpty({ message: 'featureKey is required' })
  featureKey: string;

  @IsBoolean({ message: 'isEnabled must be a boolean' })
  isEnabled: boolean;
}
