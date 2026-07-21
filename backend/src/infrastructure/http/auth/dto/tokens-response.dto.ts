import { AuthTokens } from '../../../../domain/auth/token.service';

export class TokensResponseDto {
  accessToken: string;
  refreshToken: string;

  static fromDomain(tokens: AuthTokens): TokensResponseDto {
    const dto = new TokensResponseDto();
    dto.accessToken = tokens.accessToken;
    dto.refreshToken = tokens.refreshToken;
    return dto;
  }
}
