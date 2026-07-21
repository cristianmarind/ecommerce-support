import { MessageSenderType } from '../../../../domain/messages/message-sender-type.enum';
import { Message } from '../../../../domain/messages/message.entity';

export class MessageResponseDto {
  id: string;
  senderType: MessageSenderType;
  content: string;
  suggestedResponse: string | null;
  confidenceScore: number | null;
  createdAt: Date;

  static fromDomain(message: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = message.id;
    dto.senderType = message.senderType;
    dto.content = message.content;
    dto.suggestedResponse = message.suggestedResponse;
    dto.confidenceScore = message.confidenceScore;
    dto.createdAt = message.createdAt;
    return dto;
  }
}
