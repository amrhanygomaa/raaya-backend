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
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  LanguageCode,
  OutputFormat,
  TextType,
} from '@aws-sdk/client-polly';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode as TranscribeLanguageCode,
  MediaEncoding,
} from '@aws-sdk/client-transcribe-streaming';
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

  @Post('speech')
  @ApiOperation({
    summary: 'Text-to-speech using AWS Polly Neural (Hala – Arabic)',
    description:
      'Converts Arabic text to natural-sounding speech using AWS Polly Neural engine. ' +
      'Returns base64-encoded MP3 audio.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', example: 'أهلاً، كيف حالك اليوم؟' },
        voiceId: { type: 'string', example: 'Hala', default: 'Hala' },
        engine: { type: 'string', example: 'neural', default: 'neural' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Base64-encoded MP3 audio.' })
  @ApiResponse({ status: 400, description: 'text is required.' })
  @ApiResponse({ status: 503, description: 'Polly unavailable.' })
  async synthesizeSpeech(@Body() body: unknown) {
    if (!isRecord(body)) {
      throw new BadRequestException('body must be an object');
    }

    const text = normalizeInlineText(body.text);
    if (!text) {
      throw new BadRequestException('text is required');
    }

    // Hala = Arabic female neural voice (natural Egyptian-flavored Arabic)
    const voiceId = typeof body.voiceId === 'string' ? body.voiceId : 'Hala';
    const engine: Engine =
      body.engine === 'standard' ? Engine.STANDARD : Engine.NEURAL;

    const polly = new PollyClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });

    try {
      // SSML wrapping: rate slightly slower for a calmer, natural conversation feel.
      // Note: Polly neural voices do not support the prosody `pitch` attribute.
      const ssmlText = `<speak><prosody rate="95%">${text}</prosody></speak>`;

      const command = new SynthesizeSpeechCommand({
        Text: ssmlText,
        VoiceId: voiceId as any,
        Engine: engine,
        LanguageCode: LanguageCode.arb,
        OutputFormat: OutputFormat.MP3,
        TextType: TextType.SSML,
      });

      const response = await polly.send(command);

      if (!response.AudioStream) {
        throw new ServiceUnavailableException('Polly returned no audio');
      }

      // AudioStream is a readable stream — collect all chunks
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      const audioBase64 = audioBuffer.toString('base64');

      return {
        provider: 'aws-polly',
        voiceId,
        engine,
        contentType: 'audio/mpeg',
        audioBase64,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      console.error(
        '[AI] Polly TTS failed:',
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException('Polly TTS failed');
    }
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
        max_tokens: 60,
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

  // ─────────────────────────────────────────────────────────────────────
  //  POST /ai/voice-chat
  //  End-to-end voice pipeline: STT (Transcribe) → AI (Bedrock) → TTS (Polly)
  //  Body: { audioBase64, sampleRate?, residentName?, residentId? }
  //  Returns: { transcript, reply, audioBase64, contentType }
  // ─────────────────────────────────────────────────────────────────────
  @Post('voice-chat')
  @ApiOperation({
    summary:
      'Full voice pipeline (STT → AI → TTS) — server-side, no device-locale needed',
    description:
      'Accepts recorded PCM audio (base64), transcribes it with AWS Transcribe Streaming, ' +
      'sends transcript to Bedrock for a reply, then synthesizes the reply with Polly Hala. ' +
      'Returns transcript, reply text, and base64 MP3 audio of the reply.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audioBase64'],
      properties: {
        audioBase64: {
          type: 'string',
          description: 'Base64-encoded PCM 16-bit mono audio',
        },
        sampleRate: { type: 'number', example: 16000, default: 16000 },
        residentName: { type: 'string', example: 'Ahmad' },
        residentId: { type: 'string' },
        language: { type: 'string', example: 'ar-eg', default: 'ar-eg' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Voice round-trip result.' })
  @ApiResponse({ status: 400, description: 'audioBase64 is required.' })
  @ApiResponse({ status: 503, description: 'Pipeline unavailable.' })
  async voiceChat(@Body() body: unknown) {
    if (!isRecord(body)) {
      throw new BadRequestException('body must be an object');
    }
    const audioBase64 =
      typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
    if (!audioBase64) {
      throw new BadRequestException('audioBase64 is required');
    }
    const sampleRate =
      typeof body.sampleRate === 'number' && body.sampleRate > 0
        ? Math.floor(body.sampleRate)
        : 16000;
    const residentName =
      getStringField(body, 'residentName', 'name') ?? 'صديقنا';
    const residentId = getStringField(body, 'residentId', 'userId') ?? null;
    const language = getStringField(body, 'language', 'locale') ?? 'ar-eg';

    const aiEnabled = process.env.AI_ENABLED === 'true';
    if (!aiEnabled) {
      throw new ServiceUnavailableException('AI_ENABLED is not true');
    }

    // ── 1) STT — AWS Transcribe Streaming ─────────────────────────────
    let transcript = '';
    try {
      const audioBytes = Buffer.from(audioBase64, 'base64');
      console.log(
        `[AI] voice-chat received: ${audioBytes.length} bytes, sampleRate=${sampleRate}`,
      );

      const transcribeClient = new TranscribeStreamingClient({
        region: process.env.AWS_REGION ?? 'us-east-1',
      });

      const chunkSize = 8192;
      // eslint-disable-next-line @typescript-eslint/require-await
      const audioStream = async function* () {
        for (let i = 0; i < audioBytes.length; i += chunkSize) {
          yield {
            AudioEvent: {
              AudioChunk: audioBytes.subarray(
                i,
                Math.min(i + chunkSize, audioBytes.length),
              ),
            },
          };
        }
      };

      const transcribeCommand = new StartStreamTranscriptionCommand({
        LanguageCode: TranscribeLanguageCode.AR_SA,
        MediaEncoding: MediaEncoding.PCM,
        MediaSampleRateHertz: sampleRate,
        AudioStream: audioStream(),
      });

      const transcribeResponse = await transcribeClient.send(transcribeCommand);

      if (transcribeResponse.TranscriptResultStream) {
        for await (const event of transcribeResponse.TranscriptResultStream) {
          if (event.TranscriptEvent) {
            const results = event.TranscriptEvent.Transcript?.Results ?? [];
            for (const result of results) {
              if (!result.IsPartial) {
                const text = result.Alternatives?.[0]?.Transcript ?? '';
                if (text) transcript += `${text} `;
              }
            }
          }
        }
      }
      transcript = transcript.trim();
      console.log(`[AI] transcript: "${transcript}"`);

      if (!transcript) {
        return {
          transcript: '',
          reply: '',
          audioBase64: '',
          contentType: 'audio/mpeg',
          error: 'no_speech_detected',
        };
      }
    } catch (error) {
      console.error(
        '[AI] Transcribe failed:',
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException('Transcribe failed');
    }

    // ── 2) AI — Bedrock Claude ────────────────────────────────────────
    let reply = '';
    try {
      if (this.pool && residentId) {
        const res = await this.pool.query<Record<string, unknown>>(
          `SELECT facts FROM ai_resident_memory WHERE resident_id = $1`,
          [residentId],
        );
        const memory = (res.rows[0]?.facts as string[]) ?? [];
        const sentiment = analyzeSentiment(transcript);
        const prompt = buildCompanionPrompt({
          residentName,
          message: transcript,
          language,
          memory,
          sentiment,
        });
        const command = new InvokeModelCommand({
          modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 60,
            messages: [{ role: 'user', content: prompt }],
          }),
          contentType: 'application/json',
          accept: 'application/json',
        });
        const response = await this.client.send(command);
        if (response.body) {
          const result: unknown = JSON.parse(
            Buffer.from(response.body).toString(),
          );
          reply = getClaudeReply(result) ?? '';
        }
      } else {
        const sentiment = analyzeSentiment(transcript);
        const prompt = buildCompanionPrompt({
          residentName,
          message: transcript,
          language,
          sentiment,
        });
        const command = new InvokeModelCommand({
          modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 60,
            messages: [{ role: 'user', content: prompt }],
          }),
          contentType: 'application/json',
          accept: 'application/json',
        });
        const response = await this.client.send(command);
        if (response.body) {
          const result: unknown = JSON.parse(
            Buffer.from(response.body).toString(),
          );
          reply = getClaudeReply(result) ?? '';
        }
      }
      reply = sanitizeAiReply(reply);
      console.log(`[AI] reply: "${reply}"`);
    } catch (error) {
      console.error(
        '[AI] Bedrock failed:',
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException('Bedrock failed');
    }

    // ── 3) TTS — Polly Hala Neural ────────────────────────────────────
    let replyAudioBase64 = '';
    try {
      const polly = new PollyClient({
        region: process.env.AWS_REGION ?? 'us-east-1',
      });
      const ssmlText = `<speak><prosody rate="95%">${reply}</prosody></speak>`;
      const pollyCommand = new SynthesizeSpeechCommand({
        Text: ssmlText,
        VoiceId: 'Hala',
        Engine: Engine.NEURAL,
        LanguageCode: LanguageCode.arb,
        OutputFormat: OutputFormat.MP3,
        TextType: TextType.SSML,
      });
      const pollyResponse = await polly.send(pollyCommand);
      if (pollyResponse.AudioStream) {
        const chunks: Uint8Array[] = [];
        for await (const chunk of pollyResponse.AudioStream as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        replyAudioBase64 = Buffer.concat(chunks).toString('base64');
      }
    } catch (error) {
      console.error(
        '[AI] Polly failed:',
        error instanceof Error ? error.message : error,
      );
      // مش هنرمي error — هنرجع النص بدون صوت
    }

    return {
      transcript,
      reply,
      audioBase64: replyAudioBase64,
      contentType: 'audio/mpeg',
    };
  }
}
