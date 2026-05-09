# Software Requirements Specification (SRS)

# وثيقة مواصفات متطلبات البرمجيات

**IEEE 29148:2018 Format / صيغة IEEE 29148:2018**

| Field | Value |
|-------|-------|
| **Project / المشروع** | Raaya — Elderly Care Management Platform (Backend) |
| **Story ID** | US-10-04 |
| **Epic** | EP-10 — Documentation & Handover |
| **Version / الإصدار** | 1.0 — Supervisor Review |
| **Date / التاريخ** | 2026-05-09 |
| **Repository** | `https://github.com/amrhanygomaa/raaya-backend` |
| **Author / المؤلف** | Amr Hany Gomaa |

---

## Table of Contents / جدول المحتويات

1. [Introduction / المقدمة](#1-introduction--المقدمة)
2. [Overall Description / الوصف العام](#2-overall-description--الوصف-العام)
3. [Specific Requirements / المتطلبات التفصيلية](#3-specific-requirements--المتطلبات-التفصيلية)
4. [System Interfaces / واجهات النظام](#4-system-interfaces--واجهات-النظام)
5. [Non-Functional Requirements / المتطلبات غير الوظيفية](#5-non-functional-requirements--المتطلبات-غير-الوظيفية)
6. [Constraints / القيود](#6-constraints--القيود)
7. [Appendices / الملاحق](#7-appendices--الملاحق)

---

## 1. Introduction / المقدمة

### 1.1 Purpose / الغرض

This SRS defines the software requirements for the **Raaya Backend** — a cloud-native RESTful API that powers an elderly care management platform. The document follows **IEEE 29148:2018** and is written bilingually (Arabic/English) to satisfy the academic deliverable for the graduation project.

هذه الوثيقة تُحدد متطلبات البرمجيات للواجهة الخلفية لمنصة **رعاية** — وهي واجهة برمجة تطبيقات سحابية لإدارة رعاية كبار السن. الوثيقة مُعدَّة بصيغة **IEEE 29148:2018** وبلغتين (عربي/إنجليزي) لاستيفاء متطلبات التسليم الأكاديمي لمشروع التخرج.

### 1.2 Scope / النطاق

The Raaya Backend is a **NestJS (TypeScript)** application deployed on **AWS** that provides:

الواجهة الخلفية لرعاية هي تطبيق **NestJS (TypeScript)** يُنشر على **AWS** ويوفر:

- **Authentication & RBAC** — مصادقة وتحكم بالصلاحيات عبر AWS Cognito
- **Resident Management** — إدارة بيانات المقيمين (CRUD) مع عزل المنشأة
- **Medication Tracking** — تتبع الأدوية والجرعات والتقارير
- **Health Vitals & Alerts** — قراءات العلامات الحيوية والتنبيهات
- **AI Companion & Insights** — رفيق ذكي للمقيمين عبر AWS Bedrock (Claude 3 Haiku)
- **Family Bridge** — ربط العائلة بالمقيم (وسائط، زيارات)
- **Complaints Management** — إدارة الشكاوى
- **Admin Management** — إدارة المستخدمين والإعدادات
- **Notifications** — إشعارات فورية
- **Scheduled Jobs** — مهام مجدولة (تذكيرات أدوية، ملخصات يومية/أسبوعية)
- **KPI Dashboard** — لوحة مؤشرات الأداء

### 1.3 Definitions & Acronyms / تعريفات واختصارات

| Term | Definition / التعريف |
|------|---------------------|
| **MVP** | Minimum Viable Product — الحد الأدنى من المنتج القابل للاستخدام |
| **RBAC** | Role-Based Access Control — التحكم بالوصول حسب الدور |
| **JWT** | JSON Web Token — رمز مصادقة |
| **Bedrock** | AWS Bedrock — خدمة نماذج الذكاء الاصطناعي |
| **Cognito** | AWS Cognito — خدمة إدارة هوية المستخدمين |
| **ECR** | Elastic Container Registry — سجل حاويات AWS |
| **RDS** | Relational Database Service — خدمة قاعدة بيانات AWS |
| **SRS** | Software Requirements Specification — وثيقة مواصفات المتطلبات |
| **Facility** | Care facility / المنشأة الصحية |
| **Resident** | Elderly person receiving care / المقيم (كبير السن) |

### 1.4 References / المراجع

| Document | Path |
|----------|------|
| Architecture Overview | `docs/architecture.md` |
| API Documentation | `docs/api.md` |
| AI Companion & Safety | `docs/ai-companion.md` |
| AWS-Light Foundation | `docs/aws-light-foundation.md` |
| Environment & Secrets | `docs/environment-and-secrets.md` |
| Deployment Checklist | `docs/deployment-checklist.md` |
| Demo Script | `docs/demo-script.md` |
| Smoke-Pass Checklist | `docs/smoke-pass-checklist.md` |

---

## 2. Overall Description / الوصف العام

### 2.1 Product Perspective / منظور المنتج

Raaya Backend is the **server-side component** of the Raaya platform. It acts as the single API gateway between client applications (web/mobile) and AWS cloud services.

الواجهة الخلفية لرعاية هي **المكوِّن الخادم** لمنصة رعاية. تعمل كبوابة API واحدة بين تطبيقات العملاء (ويب/موبايل) وخدمات AWS السحابية.

```
Client Apps ──► NestJS API Gateway ──► AWS Cognito (Auth)
                     │                ├── AWS Bedrock (AI)
                     │                ├── PostgreSQL / RDS (Data)
                     │                ├── S3 (Media)
                     │                └── CloudWatch (Monitoring)
                     │
         EventBridge ──► Lambda ──► /jobs endpoints
```

### 2.2 Product Functions / وظائف المنتج

| # | Module / الوحدة | Description / الوصف |
|---|----------------|---------------------|
| F1 | Auth | JWT validation via Cognito, role extraction, RBAC guards / مصادقة JWT عبر Cognito وحراسة الأدوار |
| F2 | Users | Authenticated user profile endpoints / نقاط نهاية ملف المستخدم |
| F3 | Residents | Facility-scoped CRUD for resident records / إدارة سجلات المقيمين مع عزل المنشأة |
| F4 | Medications | Schedules, overdue tracking, adherence reports / جداول الأدوية، تتبع التأخير، تقارير الالتزام |
| F5 | Health | Vital signs recording, threshold alerts / تسجيل العلامات الحيوية والتنبيهات |
| F6 | AI | Bedrock-powered chat companion, recommendations, memory, guardrails / رفيق دردشة ذكي، توصيات، ذاكرة، حواجز أمان |
| F7 | Family Bridge | Media sharing, visit management / مشاركة الوسائط وإدارة الزيارات |
| F8 | Complaints | Complaint lifecycle (open → resolved → closed) / دورة حياة الشكاوى |
| F9 | Admin | User management, facility settings / إدارة المستخدمين وإعدادات المنشأة |
| F10 | Notifications | Create, list, mark-as-read / إنشاء، عرض، تعليم كمقروء |
| F11 | Jobs | Secret-protected scheduled job endpoints / نقاط نهاية المهام المجدولة المحمية |
| F12 | KPI | Dashboard aggregation endpoint / نقطة نهاية لوحة مؤشرات الأداء |

### 2.3 User Classes / فئات المستخدمين

| Role / الدور | Permissions / الصلاحيات |
|-------------|------------------------|
| **Admin** | Full CRUD on residents, user management, facility settings / صلاحيات كاملة |
| **Doctor** | Clinical data access, view residents / وصول البيانات السريرية |
| **Nurse** | Clinical data access, medications, vitals / بيانات الأدوية والعلامات الحيوية |
| **ClinicalStaff** | Similar to Nurse / مشابه للممرض |
| **FamilyMember** | Family bridge access only / وصول ربط العائلة فقط |

### 2.4 Operating Environment / بيئة التشغيل

| Component / المكوِّن | Technology / التقنية |
|---------------------|---------------------|
| Runtime | Node.js 20 |
| Framework | NestJS 11 + TypeScript |
| Database | PostgreSQL (AWS RDS, Single-AZ) |
| Container | Docker → AWS ECR |
| Compute | AWS EC2 (t2.micro / Free Tier) |
| AI Model | AWS Bedrock — Claude 3 Haiku |
| Auth Provider | AWS Cognito |
| Object Storage | AWS S3 (private bucket) |
| Scheduling | AWS EventBridge + Lambda |
| Monitoring | AWS CloudWatch |
| CI/CD | GitHub Actions (manual deploy) |

### 2.5 Assumptions & Dependencies / الافتراضات والتبعيات

- The MVP targets a **single demo facility** within one AWS account and region (`us-east-1`).
  يستهدف الـ MVP **منشأة تجريبية واحدة** ضمن حساب AWS واحد ومنطقة واحدة.
- Bedrock (AI) is **disabled by default** (`AI_ENABLED=false`) to avoid demo costs. It is enabled only during presentation.
  Bedrock (الذكاء الاصطناعي) **معطل افتراضياً** لتجنب التكاليف، ويُفعَّل فقط أثناء العرض.
- Deployment is **manual-only** via GitHub Actions to protect Free Tier usage.
  النشر **يدوي فقط** عبر GitHub Actions لحماية الطبقة المجانية.
- The database uses seed data for demo purposes; no production data ingestion is required.
  قاعدة البيانات تستخدم بيانات تجريبية مُعدَّة مسبقاً.

---

## 3. Specific Requirements / المتطلبات التفصيلية

### 3.1 Authentication & Authorization / المصادقة والتفويض

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-AUTH-01** | The system SHALL validate JWT tokens issued by AWS Cognito using JWKS. / يجب على النظام التحقق من رموز JWT الصادرة من Cognito. | High |
| **REQ-AUTH-02** | The system SHALL extract `custom:role` and `custom:facilityId` from JWT claims. / يجب استخراج الدور ومعرف المنشأة من الرمز. | High |
| **REQ-AUTH-03** | The system SHALL enforce RBAC via `RolesGuard` and `@Roles()` decorator. / يجب تطبيق التحكم بالصلاحيات حسب الدور. | High |
| **REQ-AUTH-04** | Unauthenticated requests to protected endpoints SHALL return HTTP 401. / الطلبات غير المصادقة تُرجع 401. | High |
| **REQ-AUTH-05** | Requests with insufficient role SHALL return HTTP 403. / الطلبات بدور غير كافٍ تُرجع 403. | High |

### 3.2 Resident Management / إدارة المقيمين

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-RES-01** | Admin users SHALL be able to create resident records via `POST /residents`. / يستطيع المدير إنشاء سجل مقيم. | High |
| **REQ-RES-02** | All authenticated users SHALL be able to list residents via `GET /residents`. / جميع المستخدمين المصادقين يمكنهم عرض المقيمين. | High |
| **REQ-RES-03** | All queries SHALL be scoped to the caller's `facilityId` from JWT. / جميع الاستعلامات محدودة بمعرف المنشأة. | High |
| **REQ-RES-04** | Admin users SHALL be able to update resident records via `PATCH /residents/:id`. / يستطيع المدير تحديث السجل. | High |
| **REQ-RES-05** | Residents SHALL support status filtering (`active`, `discharged`, `deceased`). / دعم تصفية الحالة. | Medium |

### 3.3 Medication Management / إدارة الأدوية

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-MED-01** | The system SHALL provide medication schedule listing via `GET /medications/schedules`. / عرض جداول الأدوية. | High |
| **REQ-MED-02** | The system SHALL identify overdue doses via `GET /medications/overdue`. / تحديد الجرعات المتأخرة. | High |
| **REQ-MED-03** | The system SHALL provide adherence reports via `GET /medications/adherence`. / تقارير الالتزام بالأدوية. | Medium |

### 3.4 Health Vitals & Alerts / العلامات الحيوية والتنبيهات

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-HEALTH-01** | The system SHALL record and retrieve vital signs per resident. / تسجيل واسترجاع العلامات الحيوية لكل مقيم. | High |
| **REQ-HEALTH-02** | The system SHALL generate alerts when vitals exceed predefined thresholds. / توليد تنبيهات عند تجاوز الحدود. | High |

### 3.5 AI Companion & Insights / الرفيق الذكي والتوصيات

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-AI-01** | `GET /ai/recommendations/:residentId` SHALL return AI-generated health recommendations when `AI_ENABLED=true`. / إرجاع توصيات صحية عند تفعيل الذكاء الاصطناعي. | High |
| **REQ-AI-02** | When `AI_ENABLED=false`, the recommendations endpoint SHALL return a safe disabled fallback. / عند التعطيل، يُرجع رد آمن بديل. | High |
| **REQ-AI-03** | `POST /ai/chat` SHALL accept a message and return a companion reply via AWS Bedrock (Claude 3 Haiku). / قبول رسالة وإرجاع رد من الرفيق الذكي. | High |
| **REQ-AI-04** | If Bedrock fails or is disabled, `/ai/chat` SHALL return a local rule-based fallback reply. / عند فشل Bedrock، يُرجع رد محلي. | High |
| **REQ-AI-05** | All AI replies SHALL be sanitized to remove medical diagnosis, treatment, or dosage language. / تنقية جميع ردود الذكاء الاصطناعي من أي محتوى طبي تشخيصي. | High |
| **REQ-AI-06** | All AI-generated insights SHALL carry a `HUMAN_REVIEW_REQUIRED` flag. / جميع التوصيات تحمل علامة مراجعة بشرية. | High |
| **REQ-AI-07** | The AI companion SHALL support Arabic dialects (Egyptian, Saudi, Levantine) and English. / دعم اللهجات العربية والإنجليزية. | Medium |
| **REQ-AI-08** | Sentiment analysis SHALL classify user messages as positive, negative, or neutral. / تحليل المشاعر للرسائل. | Medium |
| **REQ-AI-09** | The system SHALL support resident memory storage and retrieval via `/ai/memory/:residentId`. / دعم ذاكرة المقيم. | Medium |

### 3.6 Family Bridge / ربط العائلة

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-FAM-01** | The system SHALL provide media listing per resident via `/family-bridge/media`. / عرض الوسائط لكل مقيم. | Medium |
| **REQ-FAM-02** | The system SHALL provide visit management via `/family-bridge/visits`. / إدارة الزيارات. | Medium |

### 3.7 Complaints / الشكاوى

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-COMP-01** | The system SHALL support complaint lifecycle: open → in_progress → resolved → closed. / دعم دورة حياة الشكاوى. | Medium |

### 3.8 Admin Management / إدارة النظام

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-ADM-01** | Admin users SHALL be able to list and manage users via `/admin/users`. / إدارة المستخدمين. | High |
| **REQ-ADM-02** | Admin users SHALL be able to view/update facility settings via `/admin/settings`. / إعدادات المنشأة. | Medium |

### 3.9 Notifications / الإشعارات

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-NOT-01** | The system SHALL create notifications via `POST /notifications`. / إنشاء إشعارات. | High |
| **REQ-NOT-02** | The system SHALL list notifications per user (last 20) via `GET /notifications/:userId`. / عرض آخر 20 إشعاراً لكل مستخدم. | High |
| **REQ-NOT-03** | The system SHALL mark notifications as read via `PATCH /notifications/:id/read`. / تعليم الإشعار كمقروء. | Medium |

### 3.10 Scheduled Jobs / المهام المجدولة

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-JOB-01** | Job endpoints SHALL be protected by `x-job-secret` header. / حماية نقاط المهام بسر مشترك. | High |
| **REQ-JOB-02** | `POST /jobs/medication-reminder` SHALL generate medication reminders. / توليد تذكيرات الأدوية. | High |
| **REQ-JOB-03** | `POST /jobs/daily-digest` SHALL generate a daily digest. / توليد ملخص يومي. | Medium |
| **REQ-JOB-04** | `POST /jobs/weekly-ai-summary` SHALL generate an AI summary when enabled, or return `skipped` otherwise. / ملخص أسبوعي ذكي. | Medium |

### 3.11 KPI Dashboard / لوحة مؤشرات الأداء

| ID | Requirement / المتطلب | Priority |
|----|----------------------|----------|
| **REQ-KPI-01** | `GET /kpi/dashboard` SHALL return aggregated facility metrics. / إرجاع مؤشرات أداء المنشأة. | Medium |

---

## 4. System Interfaces / واجهات النظام

### 4.1 External Interfaces / الواجهات الخارجية

| Interface / الواجهة | Protocol | Description / الوصف |
|--------------------|----------|---------------------|
| Client → API | HTTPS (port 3000) | RESTful JSON API / واجهة REST |
| API → Cognito | HTTPS | JWKS token validation / التحقق من الرموز |
| API → Bedrock | AWS SDK | AI model invocation / استدعاء نموذج الذكاء الاصطناعي |
| API → RDS | TCP/5432 | PostgreSQL queries / استعلامات قاعدة البيانات |
| API → S3 | AWS SDK | Media storage (presigned URLs) / تخزين الوسائط |
| EventBridge → Lambda → API | HTTPS | Scheduled job triggers / تشغيل المهام المجدولة |

### 4.2 API Interface Summary / ملخص واجهة الـ API

| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| Health Check | `GET /health` | No |
| Swagger | `GET /api/docs` | No |
| Auth | `GET /auth/me` | JWT |
| Users | `GET /users/me`, `/users/admin`, `/users/clinical` | JWT + Role |
| Residents | `GET/POST/PATCH /residents` | JWT (+ Admin for write) |
| Medications | `GET /medications/schedules,overdue,adherence` | JWT |
| Health | `GET /health/vitals,alerts` | JWT |
| AI | `GET/POST /ai/recommendations,chat,memory` | No (demo) |
| Family Bridge | `GET /family-bridge/media,visits` | JWT |
| Complaints | `GET/POST/PATCH /complaints` | JWT |
| Admin | `GET/PATCH /admin/users,settings` | JWT + Admin |
| Notifications | `GET/POST/PATCH /notifications` | No (demo) |
| Jobs | `POST /jobs/*` | `x-job-secret` |
| KPI | `GET /kpi/dashboard` | JWT |

---

## 5. Non-Functional Requirements / المتطلبات غير الوظيفية

### 5.1 Performance / الأداء

| ID | Requirement / المتطلب |
|----|----------------------|
| **NFR-PERF-01** | API responses (non-AI) SHALL return within **500ms** under normal load. / الاستجابة خلال 500 مللي ثانية. |
| **NFR-PERF-02** | AI chat responses SHALL return within **10 seconds** (Bedrock latency included). / ردود الذكاء الاصطناعي خلال 10 ثوانٍ. |

### 5.2 Security / الأمان

| ID | Requirement / المتطلب |
|----|----------------------|
| **NFR-SEC-01** | No secrets SHALL be committed to the repository (`.env` is gitignored). / عدم حفظ الأسرار في المستودع. |
| **NFR-SEC-02** | All database queries SHALL be facility-scoped via JWT `facilityId`. / جميع الاستعلامات محدودة بالمنشأة. |
| **NFR-SEC-03** | AI replies SHALL never contain medical diagnosis, treatment, or dosage information. / ردود الذكاء الاصطناعي لا تحتوي على تشخيص طبي. |
| **NFR-SEC-04** | S3 bucket SHALL block all public access; media served via presigned URLs. / حظر الوصول العام لـ S3. |
| **NFR-SEC-05** | SSH access SHALL be restricted to team IPs only. / تقييد SSH لعناوين الفريق فقط. |
| **NFR-SEC-06** | IAM roles SHALL follow least-privilege principle. / أدوار IAM بأقل صلاحيات ممكنة. |

### 5.3 Reliability / الموثوقية

| ID | Requirement / المتطلب |
|----|----------------------|
| **NFR-REL-01** | If Bedrock is unavailable, AI endpoints SHALL return a local fallback (no 500 errors). / عند عدم توفر Bedrock، تُرجع ردوداً محلية بديلة. |
| **NFR-REL-02** | The Docker container SHALL restart automatically on failure (`--restart unless-stopped`). / إعادة تشغيل الحاوية تلقائياً. |
| **NFR-REL-03** | A rollback procedure SHALL be documented and tested. / توثيق واختبار إجراء التراجع. |

### 5.4 Maintainability / قابلية الصيانة

| ID | Requirement / المتطلب |
|----|----------------------|
| **NFR-MAINT-01** | The codebase SHALL pass ESLint and Prettier checks. / اجتياز فحوصات ESLint و Prettier. |
| **NFR-MAINT-02** | Unit test coverage SHALL include ≥191 passing tests. / تغطية ≥191 اختبار وحدة ناجح. |
| **NFR-MAINT-03** | E2E tests SHALL validate critical user flows. / اختبارات E2E للمسارات الأساسية. |
| **NFR-MAINT-04** | CI pipeline (GitHub Actions) SHALL run lint + tests on every push to `main`. / تشغيل CI عند كل دفع. |

### 5.5 Portability / قابلية النقل

| ID | Requirement / المتطلب |
|----|----------------------|
| **NFR-PORT-01** | The application SHALL be containerized via Docker. / تحويل التطبيق لحاوية Docker. |
| **NFR-PORT-02** | The application SHALL run on any environment with Node.js 20+. / العمل على أي بيئة بها Node.js 20+. |

---

## 6. Constraints / القيود

### 6.1 AWS-Light Constraints / قيود AWS المخفَّفة

The MVP intentionally avoids expensive AWS resources to stay within Free Tier limits:

يتجنب الـ MVP عمداً موارد AWS المكلفة للبقاء ضمن حدود الطبقة المجانية:

| Constraint / القيد | Rationale / السبب |
|-------------------|-------------------|
| **No NAT Gateway** | Cost avoidance (~$32/month) / تجنب التكلفة |
| **No RDS Proxy** | Unnecessary for single-instance demo / غير ضروري للعرض |
| **No Multi-AZ RDS** | Cost avoidance; single-AZ sufficient for demo / كافٍ للعرض التجريبي |
| **No ECS Fargate** | EC2 + Docker used instead for Free Tier safety / EC2 بديل آمن |
| **Manual deploy only** | Prevents accidental resource creation / منع إنشاء موارد عرضية |
| **AI disabled by default** | Bedrock costs only during demo / تكاليف Bedrock أثناء العرض فقط |
| **Single region (us-east-1)** | Simplicity and cost / البساطة والتكلفة |
| **Single facility** | MVP scope limitation / حدود نطاق الـ MVP |

### 6.2 Technology Constraints / قيود تقنية

| Constraint / القيد | Detail / التفاصيل |
|-------------------|-------------------|
| Node.js 20 | LTS runtime required / بيئة تشغيل مطلوبة |
| TypeScript strict mode | Enforced by `tsconfig.json` / مفروض بإعدادات TypeScript |
| NestJS 11 | Framework version locked / إصدار الإطار ثابت |
| PostgreSQL | Via `pg` driver, raw SQL (no ORM) / بدون ORM |

---

## 7. Appendices / الملاحق

### Appendix A — Module-to-Source Mapping / ربط الوحدات بالملفات المصدرية

| Module | Controller | Module File |
|--------|-----------|-------------|
| App (Health) | `src/app.controller.ts` | `src/app.module.ts` |
| Auth | `src/auth/auth.controller.ts` | `src/auth/auth.module.ts` |
| Users | `src/users/users.controller.ts` | — (registered in AppModule) |
| Residents | `src/residents/residents.controller.ts` | `src/residents/residents.module.ts` |
| Medications | `src/medications/medications.controller.ts` | `src/medications/medications.module.ts` |
| Health | `src/health/health.controller.ts` | `src/health/health.module.ts` |
| AI | `src/ai/ai.controller.ts` | `src/ai/ai.module.ts` |
| Family Bridge | `src/family-bridge/family-bridge.controller.ts` | `src/family-bridge/family-bridge.module.ts` |
| Complaints | `src/complaints/complaints.controller.ts` | `src/complaints/complaints.module.ts` |
| Admin | `src/admin-management/admin-management.controller.ts` | `src/admin-management/admin-management.module.ts` |
| Notifications | `src/notifications/notifications.controller.ts` | `src/notifications/notifications.module.ts` |
| Jobs | `src/jobs/jobs.controller.ts` | `src/jobs/jobs.module.ts` |
| KPI | `src/kpi/kpi.controller.ts` | `src/kpi/kpi.module.ts` |
| Database | — | `src/database/database.module.ts` |

### Appendix B — Test Evidence / أدلة الاختبار

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ Exit 0 (warnings only) |
| `npm test -- --runInBand` | ✅ 191/191 passed (17 suites) |
| `npm run test:e2e -- --runInBand` | ✅ All passed |
| `npx nest build` | ✅ Build successful |
| Swagger UI at `/api/docs` | ✅ All endpoints documented |

### Appendix C — Acceptance Criteria Traceability / تتبع معايير القبول

| Acceptance Criterion | Evidence |
|---------------------|----------|
| Arabic and English sections are aligned | This document is fully bilingual |
| AWS-light constraints and updated acceptance references are reflected | Section 6.1 documents all constraints |
| Supervisor-review version stored in repository | `docs/final-submission/SRS.md` |

---

**End of Document / نهاية الوثيقة**
