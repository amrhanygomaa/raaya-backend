import {
  AI_CHAT_DISCLAIMER,
  AI_HUMAN_REVIEW_FLAG,
  AI_SAFE_FALLBACK_REPLY,
  AI_SUMMARY_DISCLAIMER,
  buildCompanionPrompt,
  buildWellbeingSummaryPrompt,
  containsUnsafeMedicalAdvice,
  sanitizeAiReply,
} from './ai.guardrails';

describe('AI guardrails', () => {
  it('builds a companion prompt with resident context and safety rules', () => {
    const prompt = buildCompanionPrompt({
      residentName: 'أحمد',
      message: 'حاسس بقلق شوية',
    });

    expect(prompt).toContain('أحمد');
    expect(prompt).toContain('حاسس بقلق شوية');
    expect(prompt).toContain('لا تقدم أي نصائح طبية');
    expect(prompt).toContain('يتكلم مع الممرضة');
  });

  it('builds a short bilingual-friendly wellbeing summary prompt', () => {
    const prompt = buildWellbeingSummaryPrompt({
      residentName: 'Mona',
      observations: ['slept well', 'تناولت الإفطار'],
    });

    expect(prompt).toContain('Mona');
    expect(prompt).toContain('slept well');
    expect(prompt).toContain('تناولت الإفطار');
    expect(prompt).toContain('العربية أو الإنجليزية');
    expect(prompt).toContain('المراجعة البشرية مطلوبة');
  });

  it('keeps visible human-review disclaimers available to API responses', () => {
    expect(AI_HUMAN_REVIEW_FLAG).toBe('HUMAN_REVIEW_REQUIRED');
    expect(AI_SUMMARY_DISCLAIMER).toContain('ليس تشخيصاً طبياً');
    expect(AI_CHAT_DISCLAIMER).toContain('ليس نصيحة طبية');
  });

  it('allows supportive non-medical replies', () => {
    const reply = 'أنا معاك. خذ نفس هادي وكلم الممرضة لو القلق مستمر.';

    expect(containsUnsafeMedicalAdvice(reply)).toBe(false);
    expect(sanitizeAiReply(reply)).toBe(reply);
  });

  it('replaces diagnosis language with a safe fallback', () => {
    const reply = 'You are diagnosed with diabetes.';

    expect(containsUnsafeMedicalAdvice(reply)).toBe(true);
    expect(sanitizeAiReply(reply)).toBe(AI_SAFE_FALLBACK_REPLY);
  });

  it('replaces treatment and dosage language with a safe fallback', () => {
    const reply = 'خذ هذا الدواء وزود الجرعة بالليل.';

    expect(containsUnsafeMedicalAdvice(reply)).toBe(true);
    expect(sanitizeAiReply(reply)).toBe(AI_SAFE_FALLBACK_REPLY);
  });
});
