import { IsOptional, IsString } from 'class-validator';

export class AssignPlanDto {
  @IsString() planId!: string;
  @IsOptional() @IsString() status?: string;
}
