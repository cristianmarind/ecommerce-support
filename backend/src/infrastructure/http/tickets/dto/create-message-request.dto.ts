import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
