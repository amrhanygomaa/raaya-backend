import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RealtimeGateway } from '../gateway/realtime.gateway';

interface AuthenticatedRequest {
  user: { userId: string; email: string; roles: string[]; facilityId: string };
}

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Send a message to another user (family ↔ specialist)',
  })
  @ApiResponse({ status: 201, description: 'Message sent.' })
  async send(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ) {
    const senderRole = req.user.roles[0] ?? 'unknown';
    const message = await this.messagesService.send(
      req.user.facilityId,
      req.user.userId,
      senderRole,
      dto,
    );
    this.gateway.sendMessageToUser(
      dto.recipientId,
      message as unknown as Record<string, unknown>,
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'messages',
      action: 'message_sent',
      entityId: message.id,
      residentId: dto.residentId,
      userId: dto.recipientId,
      data: message as unknown as Record<string, unknown>,
    });
    return message;
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox — latest message from each sender' })
  @ApiResponse({ status: 200, description: 'Inbox array.' })
  async inbox(@Request() req: AuthenticatedRequest) {
    return this.messagesService.getInbox(req.user.facilityId, req.user.userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread messages' })
  @ApiResponse({ status: 200, description: 'Unread count.' })
  async unreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.messagesService.unreadCount(
      req.user.facilityId,
      req.user.userId,
    );
    return { count };
  }

  @Get('thread/:otherUserId')
  @ApiOperation({ summary: 'Get conversation thread with another user' })
  @ApiParam({
    name: 'otherUserId',
    description: 'Cognito sub of the other user',
  })
  @ApiQuery({ name: 'residentId', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Messages array (oldest first).' })
  async thread(
    @Request() req: AuthenticatedRequest,
    @Param('otherUserId') otherUserId: string,
    @Query('residentId') residentId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getThread(
      req.user.facilityId,
      req.user.userId,
      otherUserId,
      residentId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('thread/:otherUserId/read')
  @ApiOperation({ summary: 'Mark all messages from a sender as read' })
  @ApiParam({
    name: 'otherUserId',
    description: 'Sender whose messages to mark read',
  })
  @ApiResponse({ status: 200, description: 'Marked as read.' })
  async markRead(
    @Request() req: AuthenticatedRequest,
    @Param('otherUserId') otherUserId: string,
  ) {
    await this.messagesService.markRead(
      req.user.facilityId,
      req.user.userId,
      otherUserId,
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'messages',
      action: 'messages_read',
      userId: req.user.userId,
    });
    return { status: 'ok' };
  }
}
