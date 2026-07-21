import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateTicketUseCase } from '../../../application/tickets/use-cases/create-ticket.use-case';
import { ListTicketsUseCase } from '../../../application/tickets/use-cases/list-tickets.use-case';
import { SendMessageUseCase } from '../../../application/tickets/use-cases/send-message.use-case';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { FakeAuthGuard } from '../auth/guards/fake-auth.guard';
import { CreateMessageRequestDto } from './dto/create-message-request.dto';
import { CreateTicketRequestDto } from './dto/create-ticket-request.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';

@UseGuards(FakeAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateTicketRequestDto,
    @CurrentUserId('customer') customerId: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.createTicketUseCase.execute(
      dto.description,
      customerId,
    );
    return TicketResponseDto.fromDomain(ticket);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    // El adminId todavía no filtra nada: quedará disponible cuando se agregue
    // autorización real (ej. limitar a los tickets asignados a ese agente).
    @CurrentUserId('admin') _adminId: string,
  ): Promise<PaginatedTicketsResponseDto> {
    const result = await this.listTicketsUseCase.execute(page, limit);

    return {
      items: result.items.map(TicketResponseDto.fromDomain),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    };
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMessageRequestDto,
    @CurrentUserId('customer') customerId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.sendMessageUseCase.execute(
      ticketId,
      dto.content,
      customerId,
    );
    return MessageResponseDto.fromDomain(message);
  }
}
