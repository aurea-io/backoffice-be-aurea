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
import { CurrentUser } from '../core/decorators/current-user.decorator.js';
import type { JwtPayload } from '../core/interfaces/context.interface.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

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
  async findAll(@Headers('x-tenant-id') tenantId?: string) {
    return this.invitationsService.findAll(tenantId);
  }

  @Delete(':id')
  async revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id);
  }
}
