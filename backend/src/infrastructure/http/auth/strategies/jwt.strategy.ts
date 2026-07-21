import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../../../domain/auth/auth-user.repository';
import { TokenPayload } from '../../../../domain/auth/token.service';
import { CurrentUserData } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Passport llama a validate() con el payload ya verificado (firma/expiración
   * ok). Se re-consulta al usuario para confirmar que sigue existiendo y usar
   * su rol/nombre vigentes, en vez de confiar ciegamente en lo que dice el
   * token de acceso. El resultado queda disponible como request.user.
   */
  async validate(payload: TokenPayload): Promise<CurrentUserData> {
    const user = await this.authUserRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
