import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../../domain/auth/auth-user.repository';
import {
  AuthTokens,
  TOKEN_SERVICE,
  TokenService,
} from '../../../domain/auth/token.service';
import { hashRefreshToken } from '../refresh-token-hash.util';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(email: string, password: string): Promise<AuthTokens> {
    const user = await this.authUserRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const tokens = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await this.authUserRepository.setRefreshTokenHash(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );

    return tokens;
  }
}
