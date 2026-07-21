import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TicketCategory } from '../../../domain/tickets/ticket-category.enum';
import { Ticket } from '../../../domain/tickets/ticket.entity';
import { TicketStatus } from '../../../domain/tickets/ticket-status.enum';
import {
  PaginatedResult,
  TicketRepository,
} from '../../../domain/tickets/ticket.repository';

/**
 * Adaptador de infraestructura que implementa el puerto TicketRepository
 * usando un arreglo en memoria. Se seedean algunos tickets de ejemplo
 * para poder probar la paginación y el frontend sin depender de BD/IA aún.
 */
@Injectable()
export class InMemoryTicketRepository implements TicketRepository {
  private readonly tickets: Ticket[] = [
    new Ticket(
      randomUUID(),
      'No puedo rastrear mi pedido #4521, la guía no muestra movimientos.',
      TicketStatus.RESOLVED_BY_AI,
      TicketCategory.SHIPPING,
      'Tu pedido fue entregado el 18/07 según la transportadora. Revisa la sección "Mis pedidos" para ver el detalle.',
      new Date('2026-07-18T10:15:00Z'),
    ),
    new Ticket(
      randomUUID(),
      'Quiero solicitar un reembolso, el producto llegó dañado.',
      TicketStatus.PENDING_AGENT,
      TicketCategory.RETURNS,
      'Un agente evaluará las fotos del producto dañado para procesar tu reembolso.',
      new Date('2026-07-18T14:32:00Z'),
    ),
    new Ticket(
      randomUUID(),
      '¿Por qué me cobraron dos veces la misma compra?',
      TicketStatus.PENDING_AGENT,
      TicketCategory.BILLING,
      'Un agente de facturación revisará el cobro duplicado en tu cuenta.',
      new Date('2026-07-19T09:05:00Z'),
    ),
    new Ticket(
      randomUUID(),
      'La app se cierra sola cuando intento pagar con tarjeta.',
      TicketStatus.PENDING_AGENT,
      TicketCategory.TECHNICAL,
      'Un agente técnico te contactará para reproducir el error de pago.',
      new Date('2026-07-19T11:47:00Z'),
    ),
    new Ticket(
      randomUUID(),
      '¿Cómo cambio la dirección de envío de un pedido ya confirmado?',
      TicketStatus.RESOLVED_BY_AI,
      TicketCategory.SHIPPING,
      'Puedes cambiar la dirección desde "Mis pedidos > Editar envío" mientras el pedido no haya sido despachado.',
      new Date('2026-07-19T16:20:00Z'),
    ),
    new Ticket(
      randomUUID(),
      'Tengo una duda general sobre los medios de pago aceptados.',
      TicketStatus.RESOLVED_BY_AI,
      TicketCategory.GENERAL,
      'Aceptamos tarjetas de crédito/débito, PSE y pago contra entrega en ciudades principales.',
      new Date('2026-07-20T08:02:00Z'),
    ),
  ];

  async create(ticket: Ticket): Promise<Ticket> {
    this.tickets.unshift(ticket);
    return ticket;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<Ticket>> {
    const start = (page - 1) * limit;
    const items = this.tickets.slice(start, start + limit);

    return {
      items,
      total: this.tickets.length,
      page,
      limit,
    };
  }
}
