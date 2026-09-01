import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // Liveness must remain available while readiness reports the dependency failure.
      this.logger.warn(`MongoDB unavailable during startup: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
