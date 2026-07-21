import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { LoginUseCase } from '../../../application/auth/use-cases/login.use-case';
import { LogoutUseCase } from '../../../application/auth/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../../application/auth/use-cases/refresh-token.use-case';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { TokensResponseDto } from './dto/tokens-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequestDto): Promise<TokensResponseDto> {
    const tokens = await this.loginUseCase.execute(dto.email, dto.password);
    return TokensResponseDto.fromDomain(tokens);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<TokensResponseDto> {
    const tokens = await this.refreshTokenUseCase.execute(dto.refreshToken);
    return TokensResponseDto.fromDomain(tokens);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: CurrentUserData): Promise<void> {
    await this.logoutUseCase.execute(user.id);
  }
}
