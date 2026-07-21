import { SetMetadata } from '@nestjs/common';

export const PROMPT_SAFETY_FIELD_KEY = 'promptSafetyField';

/**
 * Marca qué campo del body debe validar PromptSafetyGuard antes de ejecutar
 * el handler, ej. @CheckPromptSafety('description').
 */
export const CheckPromptSafety = (field: string) =>
  SetMetadata(PROMPT_SAFETY_FIELD_KEY, field);
