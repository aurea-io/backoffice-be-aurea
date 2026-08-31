import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail({}, { message: 'Email address must be valid' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}

export class VerifyMagicLinkDto {
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
