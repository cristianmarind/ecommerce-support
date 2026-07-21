import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../../domain/auth/auth-user.repository';
import {
  AuthTokens,
  TOKEN_SERVICE,
  TokenService,
} from '../../../domain/auth/token.service';
import { hashRefreshToken, refreshTokenMatches } from '../refresh-token-hash.util';

const INVALID_REFRESH_TOKEN_MESSAGE = 'Refresh token inválido';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.tokenService
      .verifyRefreshToken(refreshToken)
      .catch(() => {
        throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
      });

    const user = await this.authUserRepository.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    // Solo hay un refresh token vigente por usuario (ver AuthUserRepository):
    // si no coincide con el hash guardado, ya fue rotado o revocado (logout).
    if (!refreshTokenMatches(refreshToken, user.refreshTokenHash)) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const tokens = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Rotación: el nuevo refresh token reemplaza al usado, invalidándolo.
    await this.authUserRepository.setRefreshTokenHash(
      user.id,
      hashRefreshToken(tokens.refreshToken),
    );

    return tokens;
  }
}
