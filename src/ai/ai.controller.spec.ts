import { ServiceUnavailableException } from '@nestjs/common';
import { AiController } from './ai.controller';
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
    it('throws ServiceUnavailable when AI is disabled', async () => {
      process.env.AI_ENABLED = 'false';
      const controller = new AiController({ send: jest.fn() });
      await expect(controller.getRecommendations('resident-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('returns Bedrock summary when AI is enabled', async () => {
      process.env.AI_ENABLED = 'true';
      const send = jest.fn().mockResolvedValue({
        body: Buffer.from(
          JSON.stringify({ content: [{ text: 'توصية رعاية للمقيم.' }] }),
        ),
      });
      const controller = new AiController({ send });
      const response = await controller.getRecommendations('resident-2');

      expect(response).toMatchObject({
        enabled: true,
        residentId: 'resident-2',
        flag: AI_HUMAN_REVIEW_FLAG,
        disclaimer: AI_SUMMARY_DISCLAIMER,
      });
      expect(response.generatedAt).toEqual(expect.any(String));
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('throws ServiceUnavailable when Bedrock fails', async () => {
      process.env.AI_ENABLED = 'true';
      const controller = new AiController({
        send: jest.fn().mockRejectedValue(new Error('no credentials')),
      });
      await expect(controller.getRecommendations('resident-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('memory', () => {
    it('stores resident memory and retrieves it', async () => {
      const storedFacts: string[] = [];
      const mockPool = {
        query: jest.fn().mockImplementation((sql: string, params: unknown[]) => {
          if (/^INSERT/i.test(sql)) {
            const parsed = JSON.parse(params[1] as string) as string[];
            storedFacts.splice(0, storedFacts.length, ...parsed);
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({
            rows: storedFacts.length > 0
              ? [{ facts: storedFacts, updated_at: new Date() }]
              : [],
          });
        }),
      };

      const controller = new AiController(
        { send: jest.fn() },
        mockPool as never,
      );

      const saved = await controller.saveMemory('resident-1', {
        memory: [{ label: 'هواية', value: 'زراعة الريحان' }],
      });
      expect(saved).toMatchObject({
        residentId: 'resident-1',
        memory: ['هواية: زراعة الريحان'],
      });

      const retrieved = await controller.getMemory('resident-1');
      expect(retrieved.memory).toContain('هواية: زراعة الريحان');
    });
  });

  describe('chat', () => {
    it('throws ServiceUnavailable when AI is disabled', async () => {
      process.env.AI_ENABLED = 'false';
      const controller = new AiController({ send: jest.fn() });
      await expect(
        controller.chat({ message: 'مرحبا', residentName: 'أحمد' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws ServiceUnavailable when Bedrock fails', async () => {
      process.env.AI_ENABLED = 'true';
      const controller = new AiController({
        send: jest.fn().mockRejectedValue(new Error('no credentials')),
      });
      await expect(
        controller.chat({ message: 'مرحبا', residentName: 'أحمد' }),
      ).rejects.toThrow(ServiceUnavailableException);
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
