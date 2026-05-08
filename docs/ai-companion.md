# AI Companion & Insights

The AI Companion is a core feature of Raaya, designed to provide emotional support and daily summaries for elderly residents.

## 1. AI Model

The system uses **Anthropic Claude 3 Haiku** via **AWS Bedrock**. This model was chosen for its:

- Fast response times.
- Low cost.
- Excellent support for Arabic dialects.

## 2. Prompt Engineering

Prompts are dynamically generated based on several factors:

### Dialects

The system supports multiple Arabic dialects to make the experience feel natural:

- `ar-eg`: Egyptian (Default)
- `ar-sa`: Saudi
- `ar-levant`: Levantine (Shami)
- `en`: Simple English

### Persona

The AI persona "Rafiq" (Companion) is designed to be:

- Warm, patient, and encouraging.
- Respectful of experience and memories.
- Concisely supportive (1-2 sentences).

### Resident Memory

Chat requests can include resident memory using `memory`, `memories`,
`residentMemory`, `residentContext`, or `profile`. Memory can be strings,
structured `{ label, value }` items, or small profile objects. The backend
normalizes those inputs and adds them to the companion prompt with an explicit
instruction not to invent new memories.

For local demos, memory can also be stored in process through
`POST /ai/memory/:residentId` and reused by `/ai/chat` when the same
`residentId` is sent.

## 3. Safety Guardrails

To ensure resident safety, the following guardrails are implemented:

### Medical Advice Detection

The system scans AI replies for unsafe medical patterns (e.g., diagnosis, treatment plans, dose changes). If any are detected, the response is replaced with a safe fallback:
_"خلينا نطمن الممرضة على السؤال ده. أنا هنا أسمعك وأطمنك، لكن القرارات الصحية لازم تكون مع فريق الرعاية."_

### Sentiment Analysis

A simple keyword-based analysis identifies if the resident's message is positive, negative, or neutral. The AI's persona adjusts accordingly (e.g., being more empathetic for negative sentiment).

### Human Review Flag

All AI-generated insights are tagged with a `HUMAN_REVIEW_REQUIRED` flag to remind caregivers that AI is a support tool, not a medical professional.

## 4. Configuration

Bedrock calls can be toggled via the `AI_ENABLED` environment variable. When it
is `false`, `/ai/chat` still returns a safe local fallback reply so the resident
experience remains interactive without demo cost or AWS credentials.
