import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Valida el JWT de acceso (Authorization: Bearer ...) vía JwtStrategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
