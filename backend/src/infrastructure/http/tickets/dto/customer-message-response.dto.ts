import { MessageSenderType } from '../../../../domain/messages/message-sender-type.enum';
import { Message } from '../../../../domain/messages/message.entity';

/**
 * Versión recortada de MessageResponseDto para endpoints de cara al cliente
 * (POST /tickets, POST /tickets/:id/messages): NO incluye suggestedResponse
 * ni confidenceScore. Cuando la confianza de la IA es baja, el borrador real
 * queda guardado en Message.suggestedResponse pero solo debe llegar al
 * admin (GET /tickets) — nunca en la respuesta que ve el cliente.
 */
export class CustomerMessageResponseDto {
  id: string;
  senderType: MessageSenderType;
  content: string;
  createdAt: Date;

  static fromDomain(message: Message): CustomerMessageResponseDto {
    const dto = new CustomerMessageResponseDto();
    dto.id = message.id;
    dto.senderType = message.senderType;
    dto.content = message.content;
    dto.createdAt = message.createdAt;
    return dto;
  }
}
