import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Create / Generate Invitation Code ─────────────────────────────────────
  async create(dto: CreateInvitationDto, currentUserId?: string, activeTenantId?: string) {
    const email = dto.email.toLowerCase().trim();

    // Check if user is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`El usuario con email '${email}' ya se encuentra registrado.`);
    }

    // Determine target tenant
    const tenantId = dto.tenantId || activeTenantId || null;

    // Expiration date
    const days = dto.daysValid || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // Generate readable exclusive code (e.g. AUR-7K92X)
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `AUR-${randomPart}`;

    const invitation = await this.prisma.invitation.create({
      data: {
        code,
        email,
        role: dto.role || Role.STAFF,
        tenantId,
        expiresAt,
        used: false,
      },
    });

    this.logger.log(`Invitación generada para ${email} (Código: ${code}, Rol: ${invitation.role})`);
    return invitation;
  }

  // ── List Invitations ──────────────────────────────────────────────────────
  async findAll(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return this.prisma.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Revoke / Delete Invitation ────────────────────────────────────────────
  async revoke(id: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { id } });
    if (!inv) {
      throw new NotFoundException('Invitación no encontrada.');
    }

    if (inv.used) {
      throw new BadRequestException('No se puede revocar una invitación que ya fue utilizada.');
    }

    await this.prisma.invitation.delete({ where: { id } });
    return { success: true, message: 'Invitación revocada exitosamente.' };
  }

  // ── Validate Invitation Code ──────────────────────────────────────────────
  async validateCode(code: string, email: string) {
    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    const invitation = await this.prisma.invitation.findUnique({
      where: { code: normalizedCode },
    });

    if (!invitation) {
      throw new BadRequestException('El código de invitación es inválido o no existe.');
    }

    if (invitation.used) {
      throw new BadRequestException('Este código de invitación ya ha sido utilizado.');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new BadRequestException('Este código de invitación ha expirado.');
    }

    if (invitation.email.toLowerCase() !== normalizedEmail) {
      throw new BadRequestException(
        `Este código de invitación está reservado para el correo '${invitation.email}'.`,
      );
    }

    return invitation;
  }

  // ── Mark as Used ──────────────────────────────────────────────────────────
  async markAsUsed(id: string) {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });
  }
}
