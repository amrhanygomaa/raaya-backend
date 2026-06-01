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
import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

// ── TTS voices catalog ───────────────────────────────────────────
type TtsProvider = 'aws-polly' | 'azure' | 'elevenlabs' | 'google-gemini-tts';

interface TtsVoiceMeta {
  voiceId: string;
  displayName: string;
  displayNameAr: string;
  gender: 'male' | 'female';
  provider: TtsProvider;
  engine?: 'neural' | 'standard';
  language: string;
  description: string;
  // ElevenLabs voices use opaque hex IDs that don't reveal anything; we
  // keep an optional short label that the picker can show alongside.
  providerVoiceLabel?: string;
}

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

const SUPPORTED_VOICES: ReadonlyArray<TtsVoiceMeta> = [
  // AWS Polly
  {
    voiceId: 'Zayd',
    displayName: 'Zayd',
    displayNameAr: 'زيد',
    gender: 'male',
    provider: 'aws-polly',
    engine: 'neural',
    language: 'arb',
    description: 'Egyptian Arabic male (Polly neural)',
  },
  {
    voiceId: 'Hala',
    displayName: 'Hala',
    displayNameAr: 'هالة',
    gender: 'female',
    provider: 'aws-polly',
    engine: 'neural',
    language: 'arb',
    description: 'Egyptian Arabic female (Polly neural)',
  },
  {
    voiceId: 'Zeina',
    displayName: 'Zeina',
    displayNameAr: 'زينة',
    gender: 'female',
    provider: 'aws-polly',
    engine: 'standard',
    language: 'arb',
    description: 'Modern Standard Arabic female (Polly standard)',
  },
  // Azure Cognitive Services Speech
  {
    voiceId: 'ar-EG-SalmaNeural',
    displayName: 'Salma',
    displayNameAr: 'سلمى',
    gender: 'female',
    provider: 'azure',
    engine: 'neural',
    language: 'ar-EG',
    description: 'Egyptian Arabic female (Azure neural)',
  },
  {
    voiceId: 'ar-EG-ShakirNeural',
    displayName: 'Shakir',
    displayNameAr: 'شاكر',
    gender: 'male',
    provider: 'azure',
    engine: 'neural',
    language: 'ar-EG',
    description: 'Egyptian Arabic male (Azure neural)',
  },
  {
    voiceId: 'ar-SA-HamedNeural',
    displayName: 'Hamed',
    displayNameAr: 'حامد',
    gender: 'male',
    provider: 'azure',
    engine: 'neural',
    language: 'ar-SA',
    description: 'Standard Arabic male (Azure neural)',
  },
  {
    voiceId: 'ar-SA-ZariyahNeural',
    displayName: 'Zariyah',
    displayNameAr: 'زارية',
    gender: 'female',
    provider: 'azure',
    engine: 'neural',
    language: 'ar-SA',
    description: 'Standard Arabic female (Azure neural)',
  },
  // ElevenLabs premade voices (work on Free tier; library voices need a paid plan).
  // Adam is multilingual — handles Arabic but with a non-Egyptian accent. Polly's
  // Hala/Zayd are the recommended Egyptian-accent defaults.
  {
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    displayName: 'Adam',
    displayNameAr: 'آدم',
    gender: 'male',
    provider: 'elevenlabs',
    engine: 'neural',
    language: 'multilingual',
    description: 'Deep male multilingual (ElevenLabs premade)',
    providerVoiceLabel: 'Adam',
  },
  {
    voiceId: 'Kore',
    displayName: 'Kore',
    displayNameAr: 'كوري',
    gender: 'female',
    provider: 'google-gemini-tts',
    engine: 'neural',
    language: 'ar-EG',
    description: 'Google Cloud Gemini 2.5 Pro TTS expressive voice',
  },
];

const findVoiceMeta = (voiceId: string): TtsVoiceMeta | undefined =>
  SUPPORTED_VOICES.find((v) => v.voiceId === voiceId);

// Fallback heuristic when the voiceId isn't in the catalog:
// - Azure voices follow xx-XX-NameNeural
// - ElevenLabs voice IDs are 20-character hex-ish strings
// - Polly voices are short capitalized words
const detectProviderFromVoiceId = (voiceId: string): TtsProvider => {
  if (/^[a-z]{2,3}-[A-Z]{2,3}-/.test(voiceId)) return 'azure';
  if (/^[A-Za-z0-9]{20}$/.test(voiceId)) return 'elevenlabs';
  return 'aws-polly';
};

const normalizeRequestedTtsProvider = (value: unknown): TtsProvider | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === 'google-cloud-gemini-tts' ||
    normalized === 'google-gemini-tts' ||
    normalized === 'gemini-tts' ||
    normalized === 'google'
  ) {
    return 'google-gemini-tts';
  }
  if (normalized === 'aws-polly' || normalized === 'polly') {
    return 'aws-polly';
  }
  if (normalized === 'azure') {
    return 'azure';
  }
  if (normalized === 'elevenlabs') {
    return 'elevenlabs';
  }
  return null;
};

const escapeSsmlText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const base64Url = (value: string | Buffer): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

@ApiTags('AI')
@Controller('ai')
export class AiController {
  private readonly client: AiModelClient;
  private googleTtsToken: {
    accessToken: string;
    expiresAtMs: number;
  } | null = null;
  private googleServiceAccount: GoogleServiceAccount | null | undefined;

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

  @Get('voices')
  @ApiOperation({
    summary: 'List supported TTS voices (AWS Polly + Azure + Gemini-TTS)',
    description:
      'Returns the catalog of voices the /ai/speech endpoint can synthesize, ' +
      'with provider, gender, language, and Arabic display name. The client uses ' +
      'this to build a voice-picker UI.',
  })
  @ApiResponse({ status: 200 })
  listVoices() {
    return { voices: SUPPORTED_VOICES };
  }

  @Post('speech')
  @ApiOperation({
    summary:
      'Text-to-speech (Google Cloud Gemini-TTS, AWS Polly, Azure, or ElevenLabs)',
    description:
      'Converts Arabic text to natural-sounding speech. The provider is selected ' +
      'from provider or automatically from the voiceId. Returns base64-encoded audio.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', example: 'أهلاً، كيف حالك اليوم؟' },
        voiceId: {
          type: 'string',
          example: 'Kore',
          default: 'Kore',
          description:
            'Voice identifier. See GET /ai/voices for the supported list.',
        },
        provider: {
          type: 'string',
          example: 'google-cloud-gemini-tts',
          description:
            'Optional provider override: google-cloud-gemini-tts, aws-polly, azure, elevenlabs.',
        },
        model: {
          type: 'string',
          example: 'gemini-2.5-pro-tts',
          description: 'Gemini-TTS model name when provider is Google.',
        },
        prompt: {
          type: 'string',
          example: 'تحدث بالعربية المصرية بلهجة طبيعية ودافئة ومطمئنة.',
          description: 'Gemini-TTS style/accent/emotion instructions.',
        },
        engine: {
          type: 'string',
          example: 'neural',
          description:
            'Polly engine override (neural | standard). Ignored for Azure voices.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Base64-encoded MP3 audio.' })
  @ApiResponse({ status: 400, description: 'text is required.' })
  @ApiResponse({ status: 503, description: 'TTS provider unavailable.' })
  async synthesizeSpeech(@Body() body: unknown) {
    if (!isRecord(body)) {
      throw new BadRequestException('body must be an object');
    }

    const text = normalizeInlineText(body.text);
    if (!text) {
      throw new BadRequestException('text is required');
    }

    const voiceId =
      typeof body.voiceName === 'string'
        ? body.voiceName
        : typeof body.voiceId === 'string'
          ? body.voiceId
          : 'Hala';
    const meta = findVoiceMeta(voiceId);
    const provider: TtsProvider =
      normalizeRequestedTtsProvider(body.provider) ??
      meta?.provider ??
      detectProviderFromVoiceId(voiceId);

    if (provider === 'google-gemini-tts') {
      try {
        const audioBuffer = await this.synthesizeGoogleGeminiSpeech(
          text,
          voiceId,
          body,
        );
        return {
          provider: 'google-cloud-gemini-tts' as const,
          voiceId,
          engine: 'gemini-tts',
          contentType: 'audio/mpeg',
          audioBase64: audioBuffer.toString('base64'),
        };
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        console.error(
          '[AI] Google Gemini-TTS failed:',
          error instanceof Error ? error.message : error,
        );
        throw new ServiceUnavailableException('Google Gemini-TTS failed');
      }
    }

    if (provider === 'elevenlabs') {
      try {
        const audioBuffer = await this.synthesizeElevenLabsSpeech(
          text,
          voiceId,
        );
        return {
          provider: 'elevenlabs' as const,
          voiceId,
          engine: 'neural',
          contentType: 'audio/mpeg',
          audioBase64: audioBuffer.toString('base64'),
        };
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        console.error(
          '[AI] ElevenLabs TTS failed:',
          error instanceof Error ? error.message : error,
        );
        throw new ServiceUnavailableException('ElevenLabs TTS failed');
      }
    }

    if (provider === 'azure') {
      try {
        const language = meta?.language ?? 'ar-EG';
        const audioBuffer = await this.synthesizeAzureSpeech(
          text,
          voiceId,
          language,
        );
        return {
          provider: 'azure' as const,
          voiceId,
          engine: 'neural',
          contentType: 'audio/mpeg',
          audioBase64: audioBuffer.toString('base64'),
        };
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        console.error(
          '[AI] Azure TTS failed:',
          error instanceof Error ? error.message : error,
        );
        throw new ServiceUnavailableException('Azure TTS failed');
      }
    }

    // AWS Polly path. Voice→engine pairing is fixed by Polly:
    // Zayd/Hala are neural-only, Zeina is standard-only. Use the catalog's
    // engine when known, otherwise fall back to the request's engine.
    const engine: Engine = meta?.engine
      ? meta.engine === 'standard'
        ? Engine.STANDARD
        : Engine.NEURAL
      : body.engine === 'standard'
        ? Engine.STANDARD
        : Engine.NEURAL;

    const polly = new PollyClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });

    try {
      // SSML wrapping: rate slightly slower for a calmer, natural conversation feel.
      // Note: Polly neural voices do not support the prosody `pitch` attribute.
      const ssmlText = `<speak><prosody rate="95%">${escapeSsmlText(text)}</prosody></speak>`;

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

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      return {
        provider: 'aws-polly' as const,
        voiceId,
        engine,
        contentType: 'audio/mpeg',
        audioBase64: audioBuffer.toString('base64'),
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

  private async synthesizeGoogleGeminiSpeech(
    text: string,
    voiceId: string,
    body: Record<string, unknown>,
  ): Promise<Buffer> {
    const model =
      getStringField(body, 'model', 'modelName') ?? 'gemini-2.5-pro-tts';
    const languageCode =
      getStringField(body, 'languageCode', 'locale') ?? 'ar-EG';
    const audioEncoding =
      getStringField(body, 'audioEncoding')?.toUpperCase() ?? 'MP3';
    const prompt =
      getStringField(body, 'prompt', 'voiceInstructions') ??
      'تحدث بالعربية المصرية بلهجة طبيعية ودافئة ومطمئنة، بسرعة متوسطة وبمشاعر هادئة ومناسبة لكبار السن.';

    const accessToken = await this.getGoogleCloudAccessToken();
    const location =
      process.env.GOOGLE_CLOUD_TTS_LOCATION ??
      process.env.GOOGLE_CLOUD_REGION ??
      'global';
    const apiEndpoint =
      location === 'global'
        ? 'https://texttospeech.googleapis.com/v1/text:synthesize'
        : `https://${location}-texttospeech.googleapis.com/v1/text:synthesize`;
    const projectId = this.getGoogleCloudProjectId();

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(projectId ? { 'x-goog-user-project': projectId } : {}),
      },
      body: JSON.stringify({
        input: {
          prompt,
          text,
        },
        voice: {
          languageCode,
          name: voiceId,
          model_name: model,
        },
        audioConfig: {
          audioEncoding,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Google Gemini-TTS ${response.status}: ${errBody.slice(0, 500)}`,
      );
    }

    const data = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const audioContent =
      data && typeof data.audioContent === 'string' ? data.audioContent : null;
    if (!audioContent) {
      throw new ServiceUnavailableException(
        'Google Gemini-TTS returned no audioContent',
      );
    }

    return Buffer.from(audioContent, 'base64');
  }

  private getGoogleCloudProjectId(): string | null {
    const envProject =
      normalizeInlineText(process.env.GOOGLE_CLOUD_PROJECT) ??
      normalizeInlineText(process.env.GOOGLE_PROJECT_ID);
    if (envProject) return envProject;
    return this.loadGoogleServiceAccount()?.project_id ?? null;
  }

  private loadGoogleServiceAccount(): GoogleServiceAccount | null {
    if (this.googleServiceAccount !== undefined) {
      return this.googleServiceAccount;
    }

    const inline = normalizeInlineText(
      process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON,
    );
    const credentialsPath = normalizeInlineText(
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
    );

    let raw: string | null = inline;
    if (!raw && credentialsPath) {
      raw = readFileSync(credentialsPath, 'utf8');
    }

    if (!raw) {
      this.googleServiceAccount = null;
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clientEmail = normalizeInlineText(parsed.client_email);
    // Do NOT use normalizeInlineText here — it collapses whitespace and breaks PEM newlines
    const privateKey =
      typeof parsed.private_key === 'string'
        ? parsed.private_key.trim()
        : null;
    const projectId = normalizeInlineText(parsed.project_id) ?? undefined;
    if (!clientEmail || !privateKey) {
      throw new ServiceUnavailableException(
        'Google service account is missing client_email or private_key',
      );
    }

    this.googleServiceAccount = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
      project_id: projectId,
    };
    return this.googleServiceAccount;
  }

  private async getGoogleCloudAccessToken(): Promise<string> {
    const directToken = normalizeInlineText(
      process.env.GOOGLE_CLOUD_ACCESS_TOKEN,
    );
    if (directToken) return directToken;

    if (
      this.googleTtsToken &&
      this.googleTtsToken.expiresAtMs > Date.now() + 60_000
    ) {
      return this.googleTtsToken.accessToken;
    }

    const account = this.loadGoogleServiceAccount();
    if (!account) {
      throw new ServiceUnavailableException(
        'Google Gemini-TTS not configured (set GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)',
      );
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(
      JSON.stringify({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: issuedAt,
        exp: issuedAt + 3600,
      }),
    );
    const unsignedJwt = `${header}.${payload}`;
    const privateKeyObject = createPrivateKey({
      key: account.private_key,
      format: 'pem',
      type: 'pkcs8',
    });
    const signature = createSign('SHA256')
      .update(unsignedJwt)
      .sign(privateKeyObject);
    const assertion = `${unsignedJwt}.${base64Url(signature)}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Google OAuth ${tokenResponse.status}: ${errBody.slice(0, 300)}`,
      );
    }

    const data = (await tokenResponse.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const accessToken =
      data && typeof data.access_token === 'string' ? data.access_token : null;
    const expiresIn =
      data && typeof data.expires_in === 'number' ? data.expires_in : 3600;
    if (!accessToken) {
      throw new ServiceUnavailableException('Google OAuth returned no token');
    }

    this.googleTtsToken = {
      accessToken,
      expiresAtMs: Date.now() + expiresIn * 1000,
    };
    return accessToken;
  }

  private async synthesizeElevenLabsSpeech(
    text: string,
    voiceId: string,
  ): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'ElevenLabs not configured (ELEVENLABS_API_KEY missing)',
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `ElevenLabs TTS ${response.status}: ${errBody.slice(0, 200)}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async synthesizeAzureSpeech(
    text: string,
    voiceId: string,
    language: string,
  ): Promise<Buffer> {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) {
      throw new ServiceUnavailableException(
        'Azure Speech not configured (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing)',
      );
    }

    const ssml =
      `<speak version="1.0" xml:lang="${language}">` +
      `<voice name="${voiceId}"><prosody rate="-5%">${escapeSsmlText(text)}</prosody></voice>` +
      `</speak>`;

    const response = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'raaya-backend',
        },
        body: ssml,
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Azure TTS ${response.status}: ${errBody.slice(0, 200)}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
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
