import { IsEmail, IsNotEmpty } from 'class-validator';

export class GrantSuperAdminDto {
  @IsEmail({}, { message: 'Email address must be valid' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}
