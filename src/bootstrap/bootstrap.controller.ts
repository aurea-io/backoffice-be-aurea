import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../core/decorators/public.decorator.js';
import { BootstrapService } from './bootstrap.service.js';

@Controller('bootstrap')
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Public()
  @Get(':publicId')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  async getBootstrap(@Param('publicId') publicId: string) {
    return this.bootstrapService.getPublicBootstrap(publicId);
  }
}
