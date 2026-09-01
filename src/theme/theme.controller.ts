import { Controller, Get, Header, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../core/decorators/public.decorator.js';
import { ThemeService } from './theme.service.js';

@Controller('style')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Public()
  @Get(':publicId.css')
  @Header('Content-Type', 'text/css; charset=utf-8')
  async getStyles(
    @Param('publicId') publicId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.themeService.renderPublishedCss(publicId);
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    response.setHeader('ETag', result.etag);

    if (request.headers['if-none-match'] === result.etag) {
      response.status(304);
      return;
    }

    return result.css;
  }
}
