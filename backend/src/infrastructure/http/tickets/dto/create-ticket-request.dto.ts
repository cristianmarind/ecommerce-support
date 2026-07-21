import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTicketRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;
}
