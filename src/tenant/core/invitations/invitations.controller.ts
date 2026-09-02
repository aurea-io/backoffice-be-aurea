import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../core/interfaces/context.interface.js';
import { Public } from '../../../core/decorators/public.decorator.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Get('verify/:code')
  async verify(@Param('code') code: string) {
    return this.invitationsService.verifyPublicCode(code);
  }

  @Post('accept')
  async accept(@Body() dto: AcceptInvitationDto, @CurrentUser() user: JwtPayload) {
    return this.invitationsService.accept(dto.code, user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.invitationsService.create(dto, user.sub, tenantId);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.invitationsService.findAll(user.sub, tenantId);
  }

  @Delete(':id')
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.invitationsService.revoke(id, user.sub, tenantId);
  }
}
