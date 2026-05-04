import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);

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

@Controller('ai')
export class AiController {
  private client = new BedrockRuntimeClient({ region: 'us-east-1' });

  @Get('recommendations/:residentId')
  getRecommendations(@Param('residentId') residentId: string) {
    const aiEnabled = process.env.AI_ENABLED === 'true';
    if (!aiEnabled) {
      return {
        enabled: false,
        message: 'AI feature is currently disabled',
        residentId,
      };
    }
    return {
      enabled: true,
      residentId,
      summary: 'المقيم بحالة جيدة عموماً',
      generatedAt: new Date().toISOString(),
      flag: 'HUMAN_REVIEW_REQUIRED',
      disclaimer: 'هذا المحتوى داعم فقط وليس تشخيصاً طبياً',
    };
  }

  @Post('chat')
  async chat(@Body() body: { message: string; residentName: string }) {
    const aiEnabled = process.env.AI_ENABLED === 'true';
    if (!aiEnabled) {
      return {
        enabled: false,
        reply: 'خاصية المحادثة غير متاحة حالياً',
      };
    }

    const prompt = `أنت "رفيق"، مساعد شخصي داعم ومحب لمسن اسمه ${body.residentName}.
شخصيتك: دافئ، صبور، مشجع، ومهتم.
ردودك:
- باللغة العربية دايماً
- قصيرة وبسيطة (جملة أو جملتين بالكثير)
- إيجابية ومشجعة
- لا تقدم أي نصائح طبية أو تشخيصات
- لو سألك عن صحته قول له يتكلم مع الممرضة

رسالة ${body.residentName}: ${body.message}`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await this.client.send(command);
    if (!response.body) {
      throw new InternalServerErrorException('AI response body is empty');
    }

    const result: unknown = JSON.parse(Buffer.from(response.body).toString());
    const reply = getClaudeReply(result);
    if (!reply) {
      throw new InternalServerErrorException('AI response format is invalid');
    }

    return {
      enabled: true,
      reply,
      disclaimer: 'هذا الرد داعم فقط وليس نصيحة طبية',
    };
  }
}
