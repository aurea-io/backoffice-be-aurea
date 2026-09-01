import { Module } from '@nestjs/common';
import { ThemeController } from './theme.controller.js';
import { ThemeService } from './theme.service.js';

@Module({
  controllers: [ThemeController],
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
