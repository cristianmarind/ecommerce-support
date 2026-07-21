import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PromptSafetyCheckerService } from '../../ai/prompt-safety-checker.service';
import { PROMPT_SAFETY_FIELD_KEY } from './check-prompt-safety.decorator';

/**
 * Guard genérico y reusable: valida (vía PromptSafetyCheckerService, un LLM
 * verificador) que el campo del body marcado con @CheckPromptSafety(campo) no
 * contenga un intento de prompt injection/jailbreak antes de dejar pasar la
 * petición. Si el método no tiene @CheckPromptSafety, no hace nada.
 */
@Injectable()
export class PromptSafetyGuard implements CanActivate {
  private readonly logger = new Logger(PromptSafetyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly promptSafetyChecker: PromptSafetyCheckerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const field = this.reflector.get<string | undefined>(
      PROMPT_SAFETY_FIELD_KEY,
      context.getHandler(),
    );
    if (!field) return true;

    const request = context.switchToHttp().getRequest();
    const value = request.body?.[field];
    if (typeof value !== 'string' || !value.trim()) return true;

    const isSafe = await this.promptSafetyChecker.isSafe(value);
    if (!isSafe) {
      this.logger.warn(
        `Petición bloqueada por PromptSafetyGuard en el campo "${field}".`,
      );
      throw new BadRequestException(
        'No pudimos procesar tu mensaje: el contenido no pasó la validación de seguridad. Reformulalo e intentá de nuevo.',
      );
    }

    return true;
  }
}
