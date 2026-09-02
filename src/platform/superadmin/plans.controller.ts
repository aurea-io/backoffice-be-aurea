import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { AssignPlanDto } from './dto/assign-plan.dto.js';
import { PlansService } from './plans.service.js';

@Controller('superadmin/plans')
@UseGuards(RolesGuard)
@Roles(Role.SUPERADMIN)
export class PlansController {
  constructor(private readonly plans: PlansService) {}
  @Get() findAll() { return this.plans.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.plans.findOne(id); }
  @Post() create(@Body() dto: CreatePlanDto) { return this.plans.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) { return this.plans.update(id, dto); }
  @Post(':id/tenants/:tenantId') assign(@Param('id') id: string, @Param('tenantId') tenantId: string, @Body() dto: Omit<AssignPlanDto, 'planId'>) { return this.plans.assignTenant(tenantId, { ...dto, planId: id }); }
}
