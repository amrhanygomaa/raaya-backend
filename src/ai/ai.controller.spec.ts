import { AiController } from './ai.controller';
import { AI_DISABLED_FLAG } from './ai.insights';
import { AI_HUMAN_REVIEW_FLAG, AI_SUMMARY_DISCLAIMER } from './ai.guardrails';

describe('AiController', () => {
  const originalAiEnabled = process.env.AI_ENABLED;

  afterEach(() => {
    if (originalAiEnabled === undefined) {
      delete process.env.AI_ENABLED;
      return;
    }

    process.env.AI_ENABLED = originalAiEnabled;
  });

  describe('getRecommendations', () => {
    it('returns a safe fallback when AI is disabled', () => {
      process.env.AI_ENABLED = 'false';
      const controller = new AiController();

      expect(controller.getRecommendations('resident-1')).toEqual({
        enabled: false,
        residentId: 'resident-1',
        summary: 'AI feature is currently disabled',
        rationale:
          'AI insights are disabled by feature flag to avoid demo costs and keep the flow safe.',
        generatedAt: null,
        flag: AI_DISABLED_FLAG,
        disclaimer: AI_SUMMARY_DISCLAIMER,
      });
    });

    it('returns summary, rationale, date, and human-review flag when AI is enabled', () => {
      process.env.AI_ENABLED = 'true';
      const controller = new AiController();
      const response = controller.getRecommendations('resident-2');

      expect(response).toMatchObject({
        enabled: true,
        residentId: 'resident-2',
        summary:
          'المقيم بحالة جيدة عموماً ويحتاج متابعة روتينية من فريق الرعاية.',
        rationale:
          'هذا ملخص داعم مبني على بيانات العرض التجريبية، ولا يستبدل مراجعة الطبيب أو الممرضة.',
        flag: AI_HUMAN_REVIEW_FLAG,
        disclaimer: AI_SUMMARY_DISCLAIMER,
      });
      expect(response.generatedAt).toEqual(expect.any(String));
    });
  });

  describe('chat', () => {
    it('returns an interactive local reply when Bedrock AI is disabled', async () => {
      process.env.AI_ENABLED = 'false';
      const controller = new AiController();

      const result = await controller.chat({
        message: 'فاكر أنا بحب إيه؟',
        residentName: 'أحمد',
        memory: ['بيحب أم كلثوم'],
      });
      expect(result).toMatchObject({
        enabled: true,
        mode: 'local-fallback',
        bedrockEnabled: false,
        fallbackReason: 'ai_disabled',
        disclaimer: expect.any(String) as string,
        sentiment: 'neutral',
        memoryUsed: true,
      });
      expect(result.reply).toContain('أحمد');
      expect(result.reply).toContain('بيحب أم كلثوم');
    });

    it('stores resident memory and reuses it in local chat', async () => {
      process.env.AI_ENABLED = 'false';
      const controller = new AiController();

      const saved = controller.saveMemory('resident-1', {
        memory: [{ label: 'هواية', value: 'زراعة الريحان' }],
      });
      expect(saved).toMatchObject({
        residentId: 'resident-1',
        memory: ['هواية: زراعة الريحان'],
      });

      const result = await controller.chat({
        residentId: 'resident-1',
        residentName: 'منى',
        message: 'فاكر عني إيه؟',
      });

      expect(result.memoryUsed).toBe(true);
      expect(result.reply).toContain('زراعة الريحان');
    });

    it('accepts OpenAI-style messages and falls back if Bedrock fails', async () => {
      process.env.AI_ENABLED = 'true';
      const controller = new AiController({
        send: jest.fn().mockRejectedValue(new Error('no credentials')),
      });

      const result = await controller.chat({
        residentName: 'Mona',
        language: 'en',
        messages: [
          { role: 'assistant', content: 'Good morning' },
          { role: 'user', content: 'Do you remember my favorite song?' },
        ],
        memories: ['favorite song: Umm Kulthum'],
      });

      expect(result).toMatchObject({
        enabled: true,
        mode: 'local-fallback',
        bedrockEnabled: false,
        fallbackReason: 'bedrock_error',
        memoryUsed: true,
      });
      expect(result.reply).toContain('Umm Kulthum');
    });

    it('returns sanitized Bedrock replies when AI is enabled', async () => {
      process.env.AI_ENABLED = 'true';
      const send = jest.fn().mockResolvedValue({
        body: Buffer.from(
          JSON.stringify({ content: [{ text: 'أنا معاك يا أحمد.' }] }),
        ),
      });
      const controller = new AiController({ send });

      const result = await controller.chat({
        message: 'أهلاً',
        residentName: 'أحمد',
        memory: ['بيحب المشي'],
      });

      expect(send).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        enabled: true,
        mode: 'bedrock',
        bedrockEnabled: true,
        reply: 'أنا معاك يا أحمد.',
        memoryUsed: true,
      });
    });
  });
});
