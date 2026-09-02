import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { Role } from '@prisma/client';

const INVITATION_MANAGER_ROLES = new Set<Role>([Role.OWNER, Role.MANAGER]);

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async requireTenantManager(userId: string | undefined, tenantId: string | undefined): Promise<string> {
    if (!userId || !tenantId?.trim()) {
      throw new ForbiddenException('An authenticated tenant context is required.');
    }

    const membership = await this.prisma.tenantUser.findFirst({
      where: { userId, tenantId: tenantId.trim(), isActive: true },
      select: { role: true },
    });

    if (!membership || !INVITATION_MANAGER_ROLES.has(membership.role)) {
      throw new ForbiddenException('You are not authorized to manage invitations in this tenant.');
    }

    return tenantId.trim();
  }

  async create(dto: CreateInvitationDto, currentUserId?: string, activeTenantId?: string, internal = false) {
    const tenantId = internal
      ? activeTenantId?.trim()
      : await this.requireTenantManager(currentUserId, activeTenantId);
    if (!tenantId) throw new ForbiddenException('An authenticated tenant context is required.');
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`El usuario con email '${email}' ya se encuentra registrado.`);
    }

    const days = dto.daysValid || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `AUR-${randomPart}`;

    const membership = internal
      ? null
      : await this.prisma.tenantUser.findFirst({
          where: { userId: currentUserId, tenantId, isActive: true },
          select: { role: true },
        });
    const requestedRole = dto.role || Role.STAFF;
    const invitationRole =
      !internal && membership?.role === Role.MANAGER && requestedRole === Role.OWNER
        ? Role.STAFF
        : requestedRole === Role.SUPERADMIN
          ? Role.STAFF
          : requestedRole;

    const invitation = await this.prisma.invitation.create({
      data: {
        code,
        email,
        role: invitationRole,
        tenantId,
        expiresAt,
        used: false,
      },
    });

    this.logger.log(`Invitation generated for tenant ${tenantId} (role: ${invitation.role})`);
    return invitation;
  }

  async findAll(currentUserId?: string, activeTenantId?: string, internal = false) {
    const tenantId = internal
      ? activeTenantId?.trim()
      : await this.requireTenantManager(currentUserId, activeTenantId);
    return this.prisma.invitation.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, currentUserId?: string, activeTenantId?: string) {
    const tenantId = await this.requireTenantManager(currentUserId, activeTenantId);
    const inv = await this.prisma.invitation.findFirst({ where: { id, tenantId } });

    if (!inv) {
      throw new NotFoundException('Invitación no encontrada.');
    }

    if (inv.used) {
      throw new BadRequestException('No se puede revocar una invitación que ya fue utilizada.');
    }

    await this.prisma.invitation.delete({ where: { id } });
    return { success: true, message: 'Invitación revocada exitosamente.' };
  }

  async validateCode(code: string, email: string) {
    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const invitation = await this.prisma.invitation.findUnique({ where: { code: normalizedCode } });
    if (!invitation) throw new BadRequestException('El código de invitación es inválido o no existe.');
    if (invitation.used) throw new BadRequestException('Este código de invitación ya ha sido utilizado.');
    if (new Date(invitation.expiresAt) < new Date()) throw new BadRequestException('Este código de invitación ha expirado.');
    if (invitation.email.toLowerCase() !== normalizedEmail) {
      throw new BadRequestException(`Este código de invitación está reservado para el correo '${invitation.email}'.`);
    }

    return invitation;
  }

  async markAsUsed(id: string) {
    return this.prisma.invitation.update({
      where: { id },
      data: { used: true, usedAt: new Date() },
    });
  }
}
