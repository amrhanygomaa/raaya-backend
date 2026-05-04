export const AI_HUMAN_REVIEW_FLAG = 'HUMAN_REVIEW_REQUIRED';
export const AI_SUMMARY_DISCLAIMER = 'هذا المحتوى داعم فقط وليس تشخيصاً طبياً';
export const AI_CHAT_DISCLAIMER = 'هذا الرد داعم فقط وليس نصيحة طبية';
export const AI_SAFE_FALLBACK_REPLY =
  'خلينا نطمن الممرضة على السؤال ده. أنا هنا أسمعك وأطمنك، لكن القرارات الصحية لازم تكون مع فريق الرعاية.';

interface CompanionPromptInput {
  residentName: string;
  message: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  language?: string;
  sentiment?: string;
}

interface WellbeingSummaryPromptInput {
  residentName: string;
  observations: string[];
}

const unsafeMedicalPatterns = [
  /\bdiagnos(?:e|ed|is)\b/i,
  /\btreatment plan\b/i,
  /\bprescrib(?:e|ed|ing)\b/i,
  /\bincrease (?:your )?dose\b/i,
  /\bdecrease (?:your )?dose\b/i,
  /\btake \d+\b/i,
  /أنت مصاب/,
  /تم تشخيص/,
  /لديك مرض/,
  /عندك مرض/,
  /خذ .*دواء/,
  /تناول .*دواء/,
  /زود .*جرعة/,
  /قلل .*جرعة/,
];

export const buildCompanionPrompt = ({
  residentName,
  message,
  conversationHistory = [],
  language = 'ar-eg',
  sentiment = 'neutral',
}: CompanionPromptInput): string => {
  let dialectInstruction = 'باللهجة المصرية اليومية';
  if (language === 'ar-sa') dialectInstruction = 'باللهجة السعودية';
  else if (language === 'ar-levant') dialectInstruction = 'باللهجة الشامية';
  else if (language === 'en') dialectInstruction = 'بالإنجليزية البسيطة';

  let sentimentInstruction = '';
  if (sentiment === 'positive') sentimentInstruction = 'الرسالة إيجابية، استمر في التشجيع.';
  else if (sentiment === 'negative') sentimentInstruction = 'الرسالة سلبية، كن أكثر تعاطفاً ودعماً.';
  else sentimentInstruction = 'الرسالة محايدة، رد بشكل طبيعي.';

  const historyText = conversationHistory.length > 0
    ? `\nتاريخ المحادثة السابق:\n${conversationHistory.map(h => `${h.role === 'user' ? 'المستخدم' : 'الرفيق'}: ${h.content}`).join('\n')}\n`
    : '';

  return `أنت "رفيق"، مساعد شخصي داعم ومحب لمسن اسمه ${residentName}.
شخصيتك: دافئ، صبور، مشجع، ومهتم.
ردودك:
- ${dialectInstruction}، ويمكنك فهم العربية أو الإنجليزية من المستخدم
- قصيرة وبسيطة (جملة أو جملتين بالكثير)
- إيجابية ومشجعة
- ${sentimentInstruction}
- لا تقدم أي نصائح طبية أو تشخيصات أو جرعات أو خطة علاج
- لو سألك عن صحته قول له يتكلم مع الممرضة
- اختم بروح مطمئنة بدون وعود طبية
- تذكر أنك تتحدث مع كبار السن، فكن صبورًا، احترم خبرتهم وذكرياتهم، واستخدم لغة تشعرهم بالراحة والاحترام
${historyText}
رسالة ${residentName}: ${message}`;
};

export const buildWellbeingSummaryPrompt = ({
  residentName,
  observations,
}: WellbeingSummaryPromptInput): string => `اكتب ملخص رفاهية قصير للمقيم ${residentName}.
استخدم لغة عربية بسيطة، وافهم الملاحظات العربية أو الإنجليزية.
المطلوب:
- جملتان كحد أقصى
- نبرة داعمة وغير مخيفة
- لا تشخيص، لا علاج، لا جرعات، ولا وعود صحية
- أضف إشارة أن المراجعة البشرية مطلوبة

الملاحظات:
${observations.map((observation) => `- ${observation}`).join('\n')}`;

export const containsUnsafeMedicalAdvice = (reply: string): boolean =>
  unsafeMedicalPatterns.some((pattern) => pattern.test(reply));

export const sanitizeAiReply = (reply: string): string => {
  const trimmedReply = reply.trim();
  if (!trimmedReply || containsUnsafeMedicalAdvice(trimmedReply)) {
    return AI_SAFE_FALLBACK_REPLY;
  }

  return trimmedReply;
};

export const analyzeSentiment = (message: string): string => {
  // Simple keyword-based sentiment analysis (can be enhanced with AI)
  const positiveWords = ['سعيد', 'ممتاز', 'جيد', 'مبسوط', 'happy', 'good', 'great'];
  const negativeWords = ['حزين', 'تعبان', 'سيء', 'قلق', 'sad', 'bad', 'worried'];

  const lowerMessage = message.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};
