import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthUser,
  AuthUserRepository,
} from '../../../../domain/auth/auth-user.repository';
import { UserRole } from '../../../../domain/auth/user-role.enum';
import { UserTypeOrmEntity } from '../entities/user.typeorm-entity';

@Injectable()
export class AuthUserTypeOrmRepository implements AuthUserRepository {
  constructor(
    @InjectRepository(UserTypeOrmEntity)
    private readonly userRepo: Repository<UserTypeOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const entity = await this.userRepo.findOne({
      where: { email },
      relations: ['role'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const entity = await this.userRepo.findOne({
      where: { id },
      relations: ['role'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.userRepo.update({ id: userId }, { refreshTokenHash: hash });
  }

  private toDomain(entity: UserTypeOrmEntity): AuthUser {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      passwordHash: entity.passwordHash,
      refreshTokenHash: entity.refreshTokenHash,
      role: entity.role.name as UserRole,
    };
  }
}
