import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

// ── Events الـ Server يُرسلها للـ clients ────────────────────
// 'notification'   → إشعار جديد
// 'sos_alert'      → طوارئ SOS
// 'message'        → رسالة chat جديدة
// 'vitals_updated' → تحديث علامات حيوية

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // facilityId → Set<socketId>
  private readonly facilityRooms = new Map<string, Set<string>>();
  // socketId → { facilityId, userId }
  private readonly socketMeta = new Map<string, { facilityId: string; userId: string }>();

  constructor(@Optional() @Inject(PG_POOL) private readonly pool?: Pool) {}

  handleConnection(client: Socket) {
    // Client يرسل facilityId و userId في الـ handshake query
    const facilityId = (client.handshake.query.facilityId as string) ?? '';
    const userId = (client.handshake.query.userId as string) ?? '';

    if (!facilityId) {
      client.disconnect();
      return;
    }

    this.socketMeta.set(client.id, { facilityId, userId });

    if (!this.facilityRooms.has(facilityId)) {
      this.facilityRooms.set(facilityId, new Set());
    }
    this.facilityRooms.get(facilityId)!.add(client.id);

    // ينضم لـ room الـ facility
    void client.join(`facility:${facilityId}`);
    // وlـ room الخاص بيه لو محتاجين نبعتله رسالة مباشرة
    if (userId) void client.join(`user:${userId}`);

    console.log(`[WS] connect  ${client.id} facility=${facilityId} user=${userId}`);
  }

  handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (meta) {
      this.facilityRooms.get(meta.facilityId)?.delete(client.id);
      this.socketMeta.delete(client.id);
    }
    console.log(`[WS] disconnect ${client.id}`);
  }

  // ── Client يرسل ping للتأكد إن الاتصال شغال ────────────────
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { ts: Date.now() });
  }

  // ── Client ينضم لـ room معين (مثلاً room المسن) ─────────────
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (data?.room) void client.join(data.room);
  }

  // ════════════════════════════════════════════════════════════
  // Broadcast helpers — تستخدمها الـ controllers الأخرى
  // ════════════════════════════════════════════════════════════

  /** بث إشعار لكل المتصلين في نفس الـ facility */
  broadcastNotification(facilityId: string, payload: Record<string, unknown>) {
    this.server.to(`facility:${facilityId}`).emit('notification', {
      ...payload,
      _ts: Date.now(),
    });
  }

  /** بث تنبيه SOS لكل المتصلين في الـ facility */
  broadcastSos(facilityId: string, alert: Record<string, unknown>) {
    this.server.to(`facility:${facilityId}`).emit('sos_alert', {
      ...alert,
      _ts: Date.now(),
    });
  }

  /** إرسال رسالة chat لمستخدم محدد */
  sendMessageToUser(userId: string, message: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('message', {
      ...message,
      _ts: Date.now(),
    });
  }

  /** بث تحديث العلامات الحيوية لـ room المسن */
  broadcastVitals(residentId: string, vitals: Record<string, unknown>) {
    this.server.to(`resident:${residentId}`).emit('vitals_updated', {
      ...vitals,
      _ts: Date.now(),
    });
  }

  /** عدد المتصلين في الـ facility */
  getOnlineCount(facilityId: string): number {
    return this.facilityRooms.get(facilityId)?.size ?? 0;
  }
}
