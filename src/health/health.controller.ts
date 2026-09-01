import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../core/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok', check: 'liveness', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return {
        status: 'ok',
        check: 'readiness',
        dependencies: { mongodb: 'ok' },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        check: 'readiness',
        dependencies: { mongodb: 'unavailable' },
      });
    }
  }
}
