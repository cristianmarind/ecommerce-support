import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../../domain/auth/auth-user.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.authUserRepository.setRefreshTokenHash(userId, null);
  }
}
