import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

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
        const result = JSON.parse(Buffer.from(response.body).toString());

        return {
            enabled: true,
            reply: result.content[0].text,
            disclaimer: 'هذا الرد داعم فقط وليس نصيحة طبية',
        };
    }
}