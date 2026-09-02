import { IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString() @MinLength(5) code!: string;
}
