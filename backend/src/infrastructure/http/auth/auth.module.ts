import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginUseCase } from '../../../application/auth/use-cases/login.use-case';
import { LogoutUseCase } from '../../../application/auth/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../../application/auth/use-cases/refresh-token.use-case';
import { AUTH_USER_REPOSITORY } from '../../../domain/auth/auth-user.repository';
import { TOKEN_SERVICE } from '../../../domain/auth/token.service';
import { JwtTokenService } from '../../auth/jwt-token.service';
import { UserTypeOrmEntity } from '../../persistence/typeorm/entities/user.typeorm-entity';
import { AuthUserTypeOrmRepository } from '../../persistence/typeorm/repositories/auth-user.typeorm-repository';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserTypeOrmEntity]),
    PassportModule,
    // Secreto/expiración reales se pasan por llamada en JwtTokenService (access
    // vs refresh usan secretos distintos); acá no hace falta configurar nada.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    JwtStrategy,
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: AuthUserTypeOrmRepository,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
  ],
})
export class AuthModule {}
