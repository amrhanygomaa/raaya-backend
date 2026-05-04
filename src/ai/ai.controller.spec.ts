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
});
