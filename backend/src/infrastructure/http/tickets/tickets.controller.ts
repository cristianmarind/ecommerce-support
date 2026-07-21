import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateTicketUseCase } from '../../../application/tickets/use-cases/create-ticket.use-case';
import { GetTicketByIdUseCase } from '../../../application/tickets/use-cases/get-ticket-by-id.use-case';
import { ListTicketsUseCase } from '../../../application/tickets/use-cases/list-tickets.use-case';
import { SendMessageUseCase } from '../../../application/tickets/use-cases/send-message.use-case';
import { UpdateTicketStatusUseCase } from '../../../application/tickets/use-cases/update-ticket-status.use-case';
import { MessageSenderType } from '../../../domain/messages/message-sender-type.enum';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { FakeAuthGuard } from '../auth/guards/fake-auth.guard';
import { CheckPromptSafety } from '../guards/check-prompt-safety.decorator';
import { PromptSafetyGuard } from '../guards/prompt-safety.guard';
import { CreateMessageRequestDto } from './dto/create-message-request.dto';
import { CreateTicketRequestDto } from './dto/create-ticket-request.dto';
import { CustomerMessageResponseDto } from './dto/customer-message-response.dto';
import { CustomerPaginatedTicketsResponseDto } from './dto/customer-paginated-tickets-response.dto';
import { CustomerTicketResponseDto } from './dto/customer-ticket-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketStatusRequestDto } from './dto/update-ticket-status-request.dto';

@UseGuards(FakeAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly getTicketByIdUseCase: GetTicketByIdUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly updateTicketStatusUseCase: UpdateTicketStatusUseCase,
  ) {}

  @Post()
  @UseGuards(PromptSafetyGuard)
  @CheckPromptSafety('description')
  async create(
    @Body() dto: CreateTicketRequestDto,
    @CurrentUserId('customer') customerId: string,
  ): Promise<CustomerTicketResponseDto> {
    const ticket = await this.createTicketUseCase.execute(
      dto.description,
      customerId,
    );
    return CustomerTicketResponseDto.fromDomain(ticket);
  }

  // Rutas estáticas ("mine", "mine/:id") antes que la genérica ":id" — si no,
  // Nest/Express interpretaría "mine" como el valor del parámetro :id.

  @Get('mine')
  async findMine(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUserId('customer') customerId: string,
  ): Promise<CustomerPaginatedTicketsResponseDto> {
    const result = await this.listTicketsUseCase.execute(
      page,
      limit,
      customerId,
    );

    return {
      items: result.items.map(CustomerTicketResponseDto.fromDomain),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    };
  }

  @Get('mine/:id')
  async findMineById(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUserId('customer') customerId: string,
  ): Promise<CustomerTicketResponseDto> {
    const ticket = await this.getTicketByIdUseCase.execute(
      ticketId,
      customerId,
    );
    return CustomerTicketResponseDto.fromDomain(ticket);
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

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUserId('admin') _adminId: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.getTicketByIdUseCase.execute(ticketId);
    return TicketResponseDto.fromDomain(ticket);
  }

  @Post(':id/messages')
  @UseGuards(PromptSafetyGuard)
  @CheckPromptSafety('content')
  async sendMessage(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMessageRequestDto,
    @CurrentUserId('customer') customerId: string,
  ): Promise<CustomerMessageResponseDto> {
    const message = await this.sendMessageUseCase.execute(
      ticketId,
      dto.content,
      customerId,
      MessageSenderType.CUSTOMER,
    );
    return CustomerMessageResponseDto.fromDomain(message);
  }

  @Post(':id/agent-messages')
  @UseGuards(PromptSafetyGuard)
  @CheckPromptSafety('content')
  async sendAgentMessage(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMessageRequestDto,
    @CurrentUserId('admin') adminId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.sendMessageUseCase.execute(
      ticketId,
      dto.content,
      adminId,
      MessageSenderType.AGENT,
    );
    return MessageResponseDto.fromDomain(message);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: UpdateTicketStatusRequestDto,
    @CurrentUserId('admin') adminId: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.updateTicketStatusUseCase.execute(
      ticketId,
      dto.status,
      adminId,
    );
    return TicketResponseDto.fromDomain(ticket);
  }
}
