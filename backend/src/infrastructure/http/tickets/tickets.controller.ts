import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTicketUseCase } from '../../../application/tickets/use-cases/create-ticket.use-case';
import { ListTicketsUseCase } from '../../../application/tickets/use-cases/list-tickets.use-case';
import { CreateTicketRequestDto } from './dto/create-ticket-request.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateTicketRequestDto,
  ): Promise<TicketResponseDto> {
    const ticket = await this.createTicketUseCase.execute(dto.description);
    return TicketResponseDto.fromDomain(ticket);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
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
}
