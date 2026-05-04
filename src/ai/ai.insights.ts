import { AI_HUMAN_REVIEW_FLAG, AI_SUMMARY_DISCLAIMER } from './ai.guardrails';

export const AI_DISABLED_FLAG = 'AI_DISABLED';

export interface AiRecommendationResponse {
  enabled: boolean;
  residentId: string;
  summary: string;
  rationale: string;
  generatedAt: string | null;
  flag: string;
  disclaimer: string;
}

export const buildDisabledRecommendation = (
  residentId: string,
): AiRecommendationResponse => ({
  enabled: false,
  residentId,
  summary: 'AI feature is currently disabled',
  rationale:
    'AI insights are disabled by feature flag to avoid demo costs and keep the flow safe.',
  generatedAt: null,
  flag: AI_DISABLED_FLAG,
  disclaimer: AI_SUMMARY_DISCLAIMER,
});

export const buildDemoRecommendation = (
  residentId: string,
  generatedAt = new Date(),
): AiRecommendationResponse => ({
  enabled: true,
  residentId,
  summary: 'المقيم بحالة جيدة عموماً ويحتاج متابعة روتينية من فريق الرعاية.',
  rationale:
    'هذا ملخص داعم مبني على بيانات العرض التجريبية، ولا يستبدل مراجعة الطبيب أو الممرضة.',
  generatedAt: generatedAt.toISOString(),
  flag: AI_HUMAN_REVIEW_FLAG,
  disclaimer: AI_SUMMARY_DISCLAIMER,
});
