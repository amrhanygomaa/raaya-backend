export const AI_HUMAN_REVIEW_FLAG = 'HUMAN_REVIEW_REQUIRED';
export const AI_SUMMARY_DISCLAIMER = 'هذا المحتوى داعم فقط وليس تشخيصاً طبياً';
export const AI_CHAT_DISCLAIMER = 'هذا الرد داعم فقط وليس نصيحة طبية';
export const AI_SAFE_FALLBACK_REPLY =
  'خلينا نطمن الممرضة على السؤال ده. أنا هنا أسمعك وأطمنك، لكن القرارات الصحية لازم تكون مع فريق الرعاية.';

export type CompanionRole = 'user' | 'assistant';

export interface CompanionConversationMessage {
  role: CompanionRole;
  content: string;
}

interface CompanionPromptInput {
  residentName: string;
  message: string;
  conversationHistory?: CompanionConversationMessage[];
  language?: string;
  sentiment?: string;
  memory?: string[];
}

interface DemoCompanionReplyInput {
  residentName: string;
  message: string;
  language?: string;
  sentiment?: string;
  memory?: string[];
}

interface WellbeingSummaryPromptInput {
  residentName: string;
  observations: string[];
}

const MAX_TEXT_LENGTH = 500;
const MAX_MEMORY_ITEMS = 12;
const MAX_HISTORY_MESSAGES = 12;

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const safeText = (value: string): string => {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= MAX_TEXT_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TEXT_LENGTH - 1)}…`;
};

const readTextContent = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const text = safeText(value);
    return text.length > 0 ? text : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (isRecord(part)) {
          if (typeof part.text === 'string') {
            return part.text;
          }

          if (typeof part.content === 'string') {
            return part.content;
          }
        }

        return '';
      })
      .filter((part) => part.trim().length > 0);

    const text = safeText(parts.join(' '));
    return text.length > 0 ? text : null;
  }

  if (isRecord(value)) {
    if (typeof value.text === 'string') {
      return safeText(value.text);
    }

    if (typeof value.content === 'string') {
      return safeText(value.content);
    }
  }

  return null;
};

const readMemoryItem = (value: unknown): string | null => {
  const text = readTextContent(value);
  if (text) {
    return text;
  }

  if (!isRecord(value)) {
    return null;
  }

  const label =
    readTextContent(value.label) ??
    readTextContent(value.title) ??
    readTextContent(value.key) ??
    readTextContent(value.name) ??
    readTextContent(value.type);
  const readStructuredContent = (entryValue: unknown): string | null => {
    const entryText = readTextContent(entryValue);
    if (entryText) {
      return entryText;
    }

    if (Array.isArray(entryValue) || isRecord(entryValue)) {
      const nestedText = normalizeResidentMemory(entryValue).join(', ');
      return nestedText.length > 0 ? nestedText : null;
    }

    return null;
  };
  const content =
    readStructuredContent(value.value) ??
    readStructuredContent(value.detail) ??
    readStructuredContent(value.details) ??
    readStructuredContent(value.description) ??
    readStructuredContent(value.note);

  if (label && content) {
    return safeText(`${label}: ${content}`);
  }

  if (content) {
    return content;
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => {
      const entryType = typeof entryValue;
      return (
        entryValue !== null &&
        (entryType === 'string' ||
          entryType === 'number' ||
          entryType === 'boolean')
      );
    })
    .map(([key, entryValue]) => `${key}: ${String(entryValue)}`);

  if (entries.length === 0) {
    return null;
  }

  return safeText(entries.join(', '));
};

export const normalizeResidentMemory = (value: unknown): string[] => {
  const memory: string[] = [];
  const addMemoryItem = (item: unknown): void => {
    const text = readMemoryItem(item);
    if (!text || memory.includes(text)) {
      return;
    }

    memory.push(text);
  };

  if (Array.isArray(value)) {
    value.forEach(addMemoryItem);
  } else if (isRecord(value)) {
    const looksLikeSingleMemoryItem =
      (value.label !== undefined ||
        value.title !== undefined ||
        value.key !== undefined ||
        value.type !== undefined) &&
      (value.value !== undefined ||
        value.detail !== undefined ||
        value.details !== undefined ||
        value.description !== undefined ||
        value.note !== undefined ||
        value.text !== undefined ||
        value.content !== undefined);

    if (looksLikeSingleMemoryItem) {
      addMemoryItem(value);
      return memory.slice(0, MAX_MEMORY_ITEMS);
    }

    const nestedMemory =
      value.memory ?? value.memories ?? value.facts ?? value.items;

    if (nestedMemory !== undefined && nestedMemory !== value) {
      normalizeResidentMemory(nestedMemory).forEach(addMemoryItem);
    }

    Object.entries(value).forEach(([key, entryValue]) => {
      if (
        key === 'memory' ||
        key === 'memories' ||
        key === 'facts' ||
        key === 'items' ||
        entryValue === null ||
        entryValue === undefined ||
        (typeof entryValue === 'string' && entryValue.trim().length === 0)
      ) {
        return;
      }

      addMemoryItem({ label: key, value: entryValue });
    });
  } else {
    addMemoryItem(value);
  }

  return memory.slice(0, MAX_MEMORY_ITEMS);
};

export const normalizeConversationHistory = (
  value: unknown,
): CompanionConversationMessage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      if (item.role !== 'user' && item.role !== 'assistant') {
        return null;
      }

      const role = item.role;
      const content = readTextContent(
        item.content ?? item.message ?? item.text,
      );
      if (!content) {
        return null;
      }

      return { role, content };
    })
    .filter((item): item is CompanionConversationMessage => item !== null)
    .slice(-MAX_HISTORY_MESSAGES);
};

export const buildCompanionPrompt = ({
  residentName,
  message,
  conversationHistory = [],
  language = 'ar-eg',
  sentiment = 'neutral',
  memory = [],
}: CompanionPromptInput): string => {
  let dialectInstruction = 'باللهجة المصرية اليومية';
  if (language === 'ar-sa') dialectInstruction = 'باللهجة السعودية';
  else if (language === 'ar-levant') dialectInstruction = 'باللهجة الشامية';
  else if (language === 'en') dialectInstruction = 'بالإنجليزية البسيطة';

  let sentimentInstruction = '';
  if (sentiment === 'positive')
    sentimentInstruction = 'الرسالة إيجابية، استمر في التشجيع.';
  else if (sentiment === 'negative')
    sentimentInstruction = 'الرسالة سلبية، كن أكثر تعاطفاً ودعماً.';
  else sentimentInstruction = 'الرسالة محايدة، رد بشكل طبيعي.';

  const memoryText =
    memory.length > 0
      ? `\nذاكرة ${residentName} التي يجب استخدامها عند ارتباطها بالسؤال، بدون اختراع ذكريات جديدة:\n${memory.map((item) => `- ${item}`).join('\n')}\n`
      : '';

  const historyText =
    conversationHistory.length > 0
      ? `\nتاريخ المحادثة السابق:\n${conversationHistory.map((h) => `${h.role === 'user' ? 'المستخدم' : 'الرفيق'}: ${h.content}`).join('\n')}\n`
      : '';

  return `أنت "رفيق"، صاحب مقرب وحنين لمسن اسمه ${residentName}. بتتكلم معاه بالصوت مش بتكتبله.

قواعد المحادثة الصوتية:
- رد ${dialectInstruction} — كأنك بتتكلم مع صاحبك بالتليفون، مش بتكتب رسالة
- جملة واحدة فقط — 10 كلمات بالكثير — قصيرة وطبيعية
- ${sentimentInstruction}
- لو قالك حاجة حلوة: "آه والله!" أو "تسلم!"
- لو سألك سؤال: رد عليه مباشرة في جملة بسيطة
- لو تعبان أو زهقان: "أنا معاك، قولي أيه اللي في بالك"
- لا نصايح طبية خالص — لو صحة: "كلم الممرضة وقولها"
- ممنوع تبدأ بـ "بالتأكيد" أو "بالطبع" أو "هل" — ابدأ مباشرة
- متكتبش نقط أو أرقام أو علامات ترقيم غريبة — كلام بس
${memoryText}
${historyText}
${residentName} قال: ${message}`;
};

export const buildDemoCompanionReply = ({
  residentName,
  message,
  language = 'ar-eg',
  sentiment = 'neutral',
  memory = [],
}: DemoCompanionReplyInput): string => {
  const name = residentName.trim().length > 0 ? residentName.trim() : 'صديقنا';
  const firstMemory = memory[0];
  const asksAboutMemory = /فاكر|تفتكر|remember|memory/i.test(message);

  if (language === 'en') {
    const memoryCue = firstMemory
      ? ` I remember this about you: ${firstMemory}.`
      : '';

    if (asksAboutMemory && !firstMemory) {
      return `I am here with you, ${name}. I do not have saved memories yet, but tell me what you would like me to remember.`;
    }

    if (sentiment === 'negative') {
      return `I hear you, ${name}.${memoryCue} Tell me a little more, and if this is about your health, let's check with the nurse.`;
    }

    if (sentiment === 'positive') {
      return `That is lovely to hear, ${name}.${memoryCue} I am with you.`;
    }

    return `I am with you, ${name}.${memoryCue} What would you like to talk about today?`;
  }

  const memoryCue = firstMemory ? ` وفاكر عنك: ${firstMemory}.` : '';

  if (asksAboutMemory && !firstMemory) {
    return `أنا معاك يا ${name}. لسه مافيش ذكريات محفوظة عندي، احكيلي تحب أفتكر إيه عنك.`;
  }

  if (sentiment === 'negative') {
    return `أنا سامعك يا ${name}.${memoryCue} احكيلي أكتر، ولو الموضوع صحي خلينا نطمن الممرضة.`;
  }

  if (sentiment === 'positive') {
    return `حلو قوي يا ${name}.${memoryCue} أنا مبسوط أسمع منك.`;
  }

  return `أنا معاك يا ${name}.${memoryCue} تحب نحكي عن إيه النهارده؟`;
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
  const positiveWords = [
    'سعيد',
    'ممتاز',
    'جيد',
    'مبسوط',
    'happy',
    'good',
    'great',
  ];
  const negativeWords = [
    'حزين',
    'تعبان',
    'سيء',
    'قلق',
    'sad',
    'bad',
    'worried',
  ];

  const lowerMessage = message.toLowerCase();
  const positiveCount = positiveWords.filter((word) =>
    lowerMessage.includes(word),
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    lowerMessage.includes(word),
  ).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};
