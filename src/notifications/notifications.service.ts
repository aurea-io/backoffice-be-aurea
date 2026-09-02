import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) { return this.prisma.notification.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 }); }

  async enqueue(input: { tenantId: string; channel: 'email' | 'whatsapp'; recipient: string; subject?: string; body: string; referenceType?: string; referenceId?: string }) {
    const notification = await this.prisma.notification.create({ data: input });
    return this.dispatch(notification.id);
  }

  async retry(tenantId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, tenantId } });
    if (!notification) throw new NotFoundException('Notificación no encontrada.');
    return this.dispatch(id);
  }

  private async dispatch(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notificación no encontrada.');
    try {
      if (notification.channel === 'email') await this.sendEmail(notification);
      else await this.sendWhatsApp(notification);
      return this.prisma.notification.update({ where: { id }, data: { status: 'sent', attempts: { increment: 1 }, sentAt: new Date(), lastError: null } });
    } catch (error) {
      return this.prisma.notification.update({ where: { id }, data: { status: 'failed', attempts: { increment: 1 }, lastError: error instanceof Error ? error.message : 'delivery_failed' } });
    }
  }

  private async sendEmail(notification: any) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not configured.');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.NOTIFICATIONS_FROM || 'Aurea <onboarding@resend.dev>', to: [notification.recipient], subject: notification.subject || 'Notificación de Aurea', text: notification.body }) });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
  }

  private async sendWhatsApp(notification: any) {
    const token = process.env.WHATSAPP_TOKEN; const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new Error('WhatsApp credentials are not configured.');
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: notification.recipient, type: 'text', text: { body: notification.body } }) });
    if (!response.ok) throw new Error(`WhatsApp HTTP ${response.status}`);
  }
}
