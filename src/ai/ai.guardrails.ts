export const AI_HUMAN_REVIEW_FLAG = 'HUMAN_REVIEW_REQUIRED';
export const AI_SUMMARY_DISCLAIMER = 'هذا المحتوى داعم فقط وليس تشخيصاً طبياً';
export const AI_CHAT_DISCLAIMER = 'هذا الرد داعم فقط وليس نصيحة طبية';
export const AI_SAFE_FALLBACK_REPLY =
  'خلينا نطمن الممرضة على السؤال ده. أنا هنا أسمعك وأطمنك، لكن القرارات الصحية لازم تكون مع فريق الرعاية.';

interface CompanionPromptInput {
  residentName: string;
  message: string;
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
}: CompanionPromptInput): string => `أنت "رفيق"، مساعد شخصي داعم ومحب لمسن اسمه ${residentName}.
شخصيتك: دافئ، صبور، مشجع، ومهتم.
ردودك:
- باللغة العربية افتراضياً، ويمكنك فهم العربية أو الإنجليزية من المستخدم
- قصيرة وبسيطة (جملة أو جملتين بالكثير)
- إيجابية ومشجعة
- لا تقدم أي نصائح طبية أو تشخيصات أو جرعات أو خطة علاج
- لو سألك عن صحته قول له يتكلم مع الممرضة
- اختم بروح مطمئنة بدون وعود طبية

رسالة ${residentName}: ${message}`;

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
