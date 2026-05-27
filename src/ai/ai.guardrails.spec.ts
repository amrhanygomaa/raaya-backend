import {
  AI_CHAT_DISCLAIMER,
  AI_HUMAN_REVIEW_FLAG,
  AI_SAFE_FALLBACK_REPLY,
  AI_SUMMARY_DISCLAIMER,
  analyzeSentiment,
  buildCompanionPrompt,
  buildDemoCompanionReply,
  buildWellbeingSummaryPrompt,
  containsUnsafeMedicalAdvice,
  normalizeConversationHistory,
  normalizeResidentMemory,
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
    expect(prompt).toContain('لا نصايح طبية خالص');
    expect(prompt).toContain('كلم الممرضة وقولها');
  });

  it('builds a companion prompt with conversation history', () => {
    const prompt = buildCompanionPrompt({
      residentName: 'أحمد',
      message: 'كيف حالك اليوم؟',
      conversationHistory: [
        { role: 'user', content: 'أنا بخير' },
        { role: 'assistant', content: 'ممتاز!' },
      ],
    });

    expect(prompt).toContain('تاريخ المحادثة السابق');
    expect(prompt).toContain('المستخدم: أنا بخير');
    expect(prompt).toContain('الرفيق: ممتاز!');
  });

  it('builds a companion prompt with resident memory', () => {
    const prompt = buildCompanionPrompt({
      residentName: 'أحمد',
      message: 'فاكر أنا بحب إيه؟',
      memory: ['بيحب أم كلثوم', 'يفضل الشاي بالنعناع'],
    });

    expect(prompt).toContain('ذاكرة أحمد');
    expect(prompt).toContain('بيحب أم كلثوم');
    expect(prompt).toContain('بدون اختراع ذكريات جديدة');
  });

  it('builds a companion prompt with different languages', () => {
    const prompt = buildCompanionPrompt({
      residentName: 'أحمد',
      message: 'Hello',
      language: 'en',
    });

    expect(prompt).toContain('بالإنجليزية البسيطة');
  });

  it('builds a companion prompt with sentiment adjustment', () => {
    const prompt = buildCompanionPrompt({
      residentName: 'أحمد',
      message: 'أنا حزين',
      sentiment: 'negative',
    });

    expect(prompt).toContain('الرسالة سلبية، كن أكثر تعاطفاً ودعماً');
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

  it('normalizes resident memory from strings, objects, and nested facts', () => {
    expect(
      normalizeResidentMemory({
        favoriteSong: 'أم كلثوم',
        preferences: { drink: 'شاي بالنعناع' },
        facts: ['يمشي بعد العصر'],
      }),
    ).toEqual([
      'يمشي بعد العصر',
      'favoriteSong: أم كلثوم',
      'preferences: drink: شاي بالنعناع',
    ]);

    expect(
      normalizeResidentMemory({
        label: 'هواية',
        value: 'زراعة الريحان',
      }),
    ).toEqual(['هواية: زراعة الريحان']);

    expect(
      normalizeResidentMemory({
        favoriteSong: 'أم كلثوم',
        preferences: { drink: 'شاي بالنعناع' },
      }),
    ).toEqual(['favoriteSong: أم كلثوم', 'preferences: drink: شاي بالنعناع']);
  });

  it('normalizes conversation history from common message shapes', () => {
    expect(
      normalizeConversationHistory([
        { role: 'user', content: 'أنا بخير' },
        { role: 'assistant', text: 'جميل' },
        { role: 'system', content: 'ignore me' },
      ]),
    ).toEqual([
      { role: 'user', content: 'أنا بخير' },
      { role: 'assistant', content: 'جميل' },
    ]);
  });

  it('builds a local companion reply that can use memory', () => {
    const reply = buildDemoCompanionReply({
      residentName: 'أحمد',
      message: 'فاكر أنا بحب إيه؟',
      memory: ['بيحب أم كلثوم'],
    });

    expect(reply).toContain('أحمد');
    expect(reply).toContain('بيحب أم كلثوم');
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

  it('analyzes sentiment correctly', () => {
    expect(analyzeSentiment('أنا سعيد جداً')).toBe('positive');
    expect(analyzeSentiment('أنا حزين')).toBe('negative');
    expect(analyzeSentiment('كيف حالك')).toBe('neutral');
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
