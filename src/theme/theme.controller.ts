import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../core/decorators/public.decorator.js';
import { ThemeService } from './theme.service.js';

@Controller('style')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Public()
  @Get(':publicId.css')
  @Header('Content-Type', 'text/css; charset=utf-8')
  async getStyles(@Param('publicId') publicId: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.themeService.renderPublishedCss(publicId);
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    response.setHeader('ETag', `"${publicId.toLowerCase()}-${result.version}"`);
    return result.css;
  }
}
