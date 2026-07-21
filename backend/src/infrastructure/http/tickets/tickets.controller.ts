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
import { UserRole } from '../../../domain/auth/user-role.enum';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CheckPromptSafety } from '../guards/check-prompt-safety.decorator';
import { PromptSafetyGuard } from '../guards/prompt-safety.guard';
import { CreateMessageRequestDto } from './dto/create-message-request.dto';
import { CreateTicketRequestDto } from './dto/create-ticket-request.dto';
import { CustomerPaginatedTicketsResponseDto } from './dto/customer-paginated-tickets-response.dto';
import { CustomerTicketResponseDto } from './dto/customer-ticket-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { PaginatedTicketsResponseDto } from './dto/paginated-tickets-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateTicketStatusRequestDto } from './dto/update-ticket-status-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(UserRole.USER)
  @UseGuards(PromptSafetyGuard)
  @CheckPromptSafety('description')
  async create(
    @Body() dto: CreateTicketRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CustomerTicketResponseDto> {
    const ticket = await this.createTicketUseCase.execute(
      dto.description,
      user.id,
    );
    return CustomerTicketResponseDto.fromDomain(ticket);
  }

  // Rutas estáticas ("mine", "mine/:id") antes que la genérica ":id" — si no,
  // Nest/Express interpretaría "mine" como el valor del parámetro :id.

  @Get('mine')
  @Roles(UserRole.USER)
  async findMine(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CustomerPaginatedTicketsResponseDto> {
    const result = await this.listTicketsUseCase.execute(
      page,
      limit,
      user.id,
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
  @Roles(UserRole.USER)
  async findMineById(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<CustomerTicketResponseDto> {
    const ticket = await this.getTicketByIdUseCase.execute(ticketId, user.id);
    return CustomerTicketResponseDto.fromDomain(ticket);
  }

  @Get()
  @Roles(UserRole.ADMIN)
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

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(
    @Param('id', ParseUUIDPipe) ticketId: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.getTicketByIdUseCase.execute(ticketId);
    return TicketResponseDto.fromDomain(ticket);
  }

  @Post(':id/agent-messages')
  @Roles(UserRole.ADMIN)
  @UseGuards(PromptSafetyGuard)
  @CheckPromptSafety('content')
  async sendAgentMessage(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMessageRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<MessageResponseDto> {
    const message = await this.sendMessageUseCase.execute(
      ticketId,
      dto.content,
      user.id,
      MessageSenderType.AGENT,
    );
    return MessageResponseDto.fromDomain(message);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: UpdateTicketStatusRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<TicketResponseDto> {
    const ticket = await this.updateTicketStatusUseCase.execute(
      ticketId,
      dto.status,
      user.id,
    );
    return TicketResponseDto.fromDomain(ticket);
  }
}
