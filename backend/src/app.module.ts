import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmConfig } from './infrastructure/config/typeorm.config';
import { TicketsModule } from './infrastructure/http/tickets/tickets.module';
import { KnowledgeBaseModule } from './infrastructure/knowledge-base/knowledge-base.module';
import { IdentityModule } from './infrastructure/persistence/typeorm/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildTypeOrmConfig,
    }),
    IdentityModule,
    TicketsModule,
    KnowledgeBaseModule,
  ],
})
export class AppModule {}
