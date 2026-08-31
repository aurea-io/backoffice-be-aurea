import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './core/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      platform: 'AUREA SaaS Multi-Tenant Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
