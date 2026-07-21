import { IsEnum } from 'class-validator';
import { TicketStatus } from '../../../../domain/tickets/ticket-status.enum';

export class UpdateTicketStatusRequestDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
