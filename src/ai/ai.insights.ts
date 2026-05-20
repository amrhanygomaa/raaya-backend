import { AI_SUMMARY_DISCLAIMER } from './ai.guardrails';

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
  rationale: 'AI insights are disabled by feature flag.',
  generatedAt: null,
  flag: AI_DISABLED_FLAG,
  disclaimer: AI_SUMMARY_DISCLAIMER,
});
