import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AI_CHAT_DISCLAIMER,
  AI_HUMAN_REVIEW_FLAG,
  AI_SUMMARY_DISCLAIMER,
  CompanionConversationMessage,
  buildCompanionPrompt,
  normalizeConversationHistory,
  normalizeResidentMemory,
  sanitizeAiReply,
  analyzeSentiment,
} from './ai.guardrails';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);

export const AI_MODEL_CLIENT = 'AI_MODEL_CLIENT';

const normalizeInlineText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
};

const getClaudeReply = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const content = value.content;
  if (!isUnknownArray(content)) {
    return null;
  }

  const [firstBlock] = content;
  if (!isRecord(firstBlock) || typeof firstBlock.text !== 'string') {
    return null;
  }

  return firstBlock.text;
};

interface AiModelClient {
  send(command: InvokeModelCommand): Promise<{ body?: Uint8Array }>;
}


interface NormalizedChatRequest {
  message: string;
  residentName: string;
  residentId: string | null;
  conversationHistory: CompanionConversationMessage[];
  language: string;
  memory: string[];
}

const getStringField = (
  source: Record<string, unknown>,
  ...keys: string[]
): string | null => {
  for (const key of keys) {
    const value = normalizeInlineText(source[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

const getNestedStringField = (
  source: Record<string, unknown>,
  objectKey: string,
  ...keys: string[]
): string | null => {
  const value = source[objectKey];
  if (!isRecord(value)) {
    return null;
  }

  return getStringField(value, ...keys);
};

const getMessageTextFromContent = (value: unknown): string | null => {
  const text = normalizeInlineText(value);
  if (text) {
    return text;
  }

  if (isRecord(value)) {
    return (
      normalizeInlineText(value.text) ??
      normalizeInlineText(value.content) ??
      normalizeInlineText(value.message)
    );
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (isRecord(item)) {
          return (
            normalizeInlineText(item.text) ??
            normalizeInlineText(item.content) ??
            ''
          );
        }

        return '';
      })
      .filter((item) => item.length > 0);

    return normalizeInlineText(parts.join(' '));
  }

  return null;
};

const getLatestUserMessage = (
  messages: unknown,
): { message: string | null; history: CompanionConversationMessage[] } => {
  if (!Array.isArray(messages)) {
    return { message: null, history: [] };
  }

  const normalizedMessages = messages
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      if (item.role !== 'user' && item.role !== 'assistant') {
        return null;
      }

      const role = item.role;
      const content = getMessageTextFromContent(
        item.content ?? item.message ?? item.text,
      );
      if (!content) {
        return null;
      }

      return { role, content };
    })
    .filter((item): item is CompanionConversationMessage => item !== null);

  for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
    if (normalizedMessages[index].role === 'user') {
      return {
        message: normalizedMessages[index].content,
        history: normalizedMessages.slice(0, index).slice(-12),
      };
    }
  }

  return { message: null, history: normalizedMessages.slice(-12) };
};

@ApiTags('AI')
@Controller('ai')
export class AiController {
  private readonly client: AiModelClient;

  constructor(
    @Optional() @Inject(AI_MODEL_CLIENT) client?: AiModelClient,
    @Optional() @Inject(PG_POOL) private readonly pool?: Pool,
  ) {
    this.client =
      client ??
      new BedrockRuntimeClient({
        region: process.env.AWS_REGION ?? 'us-east-1',
      });
  }

  @Get('recommendations/:residentId')
  @ApiOperation({
    summary: 'Get AI recommendations for a resident',
    description:
      'Returns a Bedrock-generated recommendation. If AI is disabled or Bedrock fails, the endpoint fails instead of returning synthetic data.',
  })
  @ApiParam({ name: 'residentId', description: 'Resident identifier' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendation.',
  })
  @ApiResponse({ status: 503, description: 'AI service unavailable.' })
  async getRecommendations(@Param('residentId') residentId: string) {
    const aiEnabled = process.env.AI_ENABLED === 'true';
    if (!aiEnabled) {
      throw new ServiceUnavailableException('AI_ENABLED is not true');
    }

    const prompt = `
اكتب توصية رعاية قصيرة بالعربية لمقيم داخل دار رعاية.
لا تخترع تشخيصاً أو قياسات طبية غير متاحة.
إذا لم تكن هناك بيانات كافية، قل بوضوح إن التوصية تحتاج بيانات إضافية.
residentId: ${residentId}
أرجع فقرتين فقط: ملخص، ثم سبب مختصر.
`;

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 260,
        messages: [{ role: 'user', content: prompt }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    try {
      const response = await this.client.send(command);
      if (!response.body) {
        throw new ServiceUnavailableException('Bedrock returned no body');
      }
      const result: unknown = JSON.parse(Buffer.from(response.body).toString());
      const reply = getClaudeReply(result);
      if (!reply) {
        throw new ServiceUnavailableException('Bedrock returned no text');
      }

      return {
        enabled: true,
        residentId,
        summary: sanitizeAiReply(reply),
        rationale:
          'Generated by AWS Bedrock from the available request context.',
        generatedAt: new Date().toISOString(),
        flag: AI_HUMAN_REVIEW_FLAG,
        disclaimer: AI_SUMMARY_DISCLAIMER,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      console.error(
        '[AI] Bedrock recommendation failed:',
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException('Bedrock recommendation failed');
    }
  }

  @Get('memory/:residentId')
  @ApiOperation({ summary: 'Get stored memory for a resident' })
  @ApiParam({
    name: 'residentId',
    description: 'Resident identifier',
    example: 'a1b2c3d4-0000-0000-0000-000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Resident memory array.',
    schema: {
      type: 'object',
      properties: {
        residentId: {
          type: 'string',
          example: 'a1b2c3d4-0000-0000-0000-000000000001',
        },
        memory: {
          type: 'array',
          items: { type: 'string' },
          example: ['Likes reading Quran in the morning'],
        },
        updatedAt: {
          type: 'string',
          nullable: true,
          example: '2025-05-08T10:00:00.000Z',
        },
      },
    },
  })
  async getMemory(@Param('residentId') residentId: string) {
    if (this.pool) {
      const res = await this.pool.query<Record<string, unknown>>(
        `SELECT facts, updated_at FROM ai_resident_memory WHERE resident_id = $1`,
        [residentId],
      );
      const row = res.rows[0];
      return {
        residentId,
        memory: (row?.facts as string[]) ?? [],
        updatedAt: row ? (row.updated_at as Date)?.toISOString?.() : null,
      };
    }
    return { residentId, memory: [], updatedAt: null };
  }

  @Post('memory/:residentId')
  @ApiOperation({ summary: 'Save memory facts for a resident' })
  @ApiParam({
    name: 'residentId',
    description: 'Resident identifier',
    example: 'a1b2c3d4-0000-0000-0000-000000000001',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        memory: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Likes reading Quran in the morning',
            'Prefers warm drinks',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Memory saved.' })
  @ApiResponse({
    status: 400,
    description: 'memory must include at least one item.',
  })
  async saveMemory(
    @Param('residentId') residentId: string,
    @Body() body: unknown,
  ) {
    const source =
      isRecord(body) &&
      (body.memory !== undefined ||
        body.memories !== undefined ||
        body.facts !== undefined)
        ? (body.memory ?? body.memories ?? body.facts)
        : body;
    const memory = normalizeResidentMemory(source);
    if (memory.length === 0) {
      throw new BadRequestException('memory must include at least one item');
    }

    const updatedAt = new Date().toISOString();

    if (this.pool) {
      await this.pool.query(
        `INSERT INTO ai_resident_memory (resident_id, facts, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (resident_id)
         DO UPDATE SET facts = $2::jsonb, updated_at = NOW()`,
        [residentId, JSON.stringify(memory)],
      );
    }

    return { residentId, memory, updatedAt };
  }

  private normalizeChatRequest(body: unknown): NormalizedChatRequest {
    if (!isRecord(body)) {
      throw new BadRequestException('chat body must be an object');
    }

    const messageFromBody = getMessageTextFromContent(
      body.message ?? body.content ?? body.text,
    );
    const messageFromMessages = getLatestUserMessage(body.messages);
    const message = messageFromBody ?? messageFromMessages.message;

    if (!message) {
      throw new BadRequestException('message is required');
    }

    const residentName =
      getStringField(body, 'residentName', 'name') ??
      getNestedStringField(body, 'resident', 'name', 'residentName') ??
      'صديقنا';
    const residentId =
      getStringField(body, 'residentId', 'userId') ??
      getNestedStringField(body, 'resident', 'id', 'residentId');
    const language = getStringField(body, 'language', 'locale') ?? 'ar-eg';
    const explicitHistory = normalizeConversationHistory(
      body.conversationHistory ?? body.history,
    );
    const conversationHistory =
      explicitHistory.length > 0
        ? explicitHistory
        : messageFromMessages.history;
    const memoryFromBody = normalizeResidentMemory(
      body.memory ??
        body.memories ??
        body.residentMemory ??
        body.residentContext ??
        body.profile ??
        (isRecord(body.resident) ? body.resident.memory : undefined),
    );
    const memory = Array.from(new Set([...memoryFromBody]));

    return {
      message,
      residentName,
      residentId,
      conversationHistory,
      language,
      memory,
    };
  }

  private throwAiUnavailable(reason: 'ai_disabled' | 'bedrock_error'): never {
    throw new ServiceUnavailableException(
      reason === 'ai_disabled'
        ? 'AI_ENABLED is not true'
        : 'Bedrock chat failed',
    );
  }

  @Post('chat')
  @ApiOperation({
    summary: 'AI companion chat',
    description:
      'Send a message to the AI companion on behalf of a resident. ' +
      'Requires AI_ENABLED=true and a working AWS Bedrock connection.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', example: 'كيف حالك اليوم؟' },
        residentName: { type: 'string', example: 'Ahmad' },
        residentId: {
          type: 'string',
          example: 'a1b2c3d4-0000-0000-0000-000000000001',
        },
        language: { type: 'string', example: 'ar-eg', default: 'ar-eg' },
        conversationHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant'] },
              content: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'AI companion reply.' })
  @ApiResponse({ status: 400, description: 'message is required.' })
  @ApiResponse({ status: 503, description: 'AI service unavailable.' })
  async chat(@Body() body: unknown) {
    const request = this.normalizeChatRequest(body);

    if (this.pool && request.residentId && request.memory.length === 0) {
      const res = await this.pool.query<Record<string, unknown>>(
        `SELECT facts FROM ai_resident_memory WHERE resident_id = $1`,
        [request.residentId],
      );
      const stored = (res.rows[0]?.facts as string[]) ?? [];
      request.memory = stored;
    }

    const aiEnabled = process.env.AI_ENABLED === 'true';
    if (!aiEnabled) {
      this.throwAiUnavailable('ai_disabled');
    }

    const sentiment = analyzeSentiment(request.message);
    const prompt = buildCompanionPrompt({
      residentName: request.residentName,
      message: request.message,
      conversationHistory: request.conversationHistory,
      language: request.language,
      memory: request.memory,
      sentiment,
    });

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    try {
      const response = await this.client.send(command);
      if (!response.body) {
        this.throwAiUnavailable('bedrock_error');
      }

      const result: unknown = JSON.parse(Buffer.from(response.body).toString());
      const reply = getClaudeReply(result);
      if (!reply) {
        this.throwAiUnavailable('bedrock_error');
      }

      return {
        enabled: true,
        mode: 'bedrock',
        bedrockEnabled: true,
        reply: sanitizeAiReply(reply),
        disclaimer: AI_CHAT_DISCLAIMER,
        sentiment,
        memoryUsed: request.memory.length > 0,
      };
    } catch (error) {
      console.error(
        '[AI] Bedrock call failed:',
        error instanceof Error ? error.message : error,
      );
      this.throwAiUnavailable('bedrock_error');
    }
  }
}
