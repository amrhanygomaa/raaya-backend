# Raaya API Documentation

This document provides detailed information about the available API endpoints in the Raaya Backend.

## Base URL

The base URL depends on the environment:

- **Development**: `http://localhost:3000`
- **Production**: Defined by `BACKEND_URL` in AWS environment.

---

## 1. Authentication (`/auth`)

### Get Current User Profile

Returns the profile information of the authenticated user.

- **URL**: `/auth/me`
- **Method**: `GET`
- **Security**: Requires JWT in `Authorization: Bearer <token>` header.
- **Success Response (200 OK)**:
  ```json
  {
    "userId": "uuid-string",
    "email": "user@example.com",
    "role": "admin|staff|caregiver",
    "facilityId": "facility-id"
  }
  ```

---

## 2. AI Insights & Chat (`/ai`)

### Get Resident Recommendations

Retrieves AI-generated health recommendations for a specific resident.

- **URL**: `/ai/recommendations/:residentId`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "enabled": true,
    "residentId": "demo-resident",
    "summary": "المقيم بحالة جيدة عموماً...",
    "rationale": "هذا ملخص داعم مبني على بيانات العرض التجريبية...",
    "generatedAt": "2024-05-04T22:00:00.000Z",
    "flag": "HUMAN_REVIEW_REQUIRED",
    "disclaimer": "هذا المحتوى داعم فقط وليس تشخيصاً طبياً"
  }
  ```

### AI Chat Companion

Interacts with the AI companion for a resident.

- **URL**: `/ai/chat`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "residentId": "demo-resident",
    "message": "أنا حاسس بشوية تعب اليوم",
    "residentName": "أحمد",
    "conversationHistory": [],
    "memory": ["بيحب أم كلثوم", "يفضل الشاي بالنعناع"],
    "language": "ar-eg"
  }
  ```
  The endpoint also accepts OpenAI-style `messages`, plus `memory`,
  `memories`, `residentMemory`, `residentContext`, or `profile` for resident
  context.
- **Success Response (200 OK)**:
  ```json
  {
    "enabled": true,
    "mode": "bedrock",
    "bedrockEnabled": true,
    "reply": "سلامتك يا أحمد، أنا هنا معاك. تحب نتكلم في حاجة تانية تطمنك؟",
    "disclaimer": "هذا الرد داعم فقط وليس نصيحة طبية",
    "sentiment": "negative",
    "memoryUsed": true
  }
  ```
  If Bedrock is disabled or unavailable, the API still returns a safe local
  companion reply with `"mode": "local-fallback"` so the UI remains
  interactive during local demos.

### Resident Memory

Stores lightweight in-process resident memory for demos.

- **URL**: `/ai/memory/:residentId`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "memory": [{ "label": "هواية", "value": "زراعة الريحان" }, "بيحب أم كلثوم"]
  }
  ```
- **Success Response (200 OK)**:

  ```json
  {
    "residentId": "demo-resident",
    "memory": ["هواية: زراعة الريحان", "بيحب أم كلثوم"],
    "updatedAt": "2026-05-04T20:00:00.000Z"
  }
  ```

- **URL**: `/ai/memory/:residentId`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "residentId": "demo-resident",
    "memory": ["هواية: زراعة الريحان", "بيحب أم كلثوم"],
    "updatedAt": "2026-05-04T20:00:00.000Z"
  }
  ```

---

## 3. Job Scheduling (`/jobs`)

These endpoints are designed for internal use by AWS Lambda triggers and are protected by a secret.

- **Security**: Requires `x-job-secret` header matching the `JOB_SECRET` environment variable.

### Medication Reminder

- **URL**: `/jobs/medication-reminder`
- **Method**: `POST`

### Daily Digest

- **URL**: `/jobs/daily-digest`
- **Method**: `POST`

### Weekly AI Summary

- **URL**: `/jobs/weekly-ai-summary`
- **Method**: `POST`

---

## 4. Notifications (`/notifications`)

### Create Notification

- **URL**: `/notifications`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "userId": "uuid",
    "message": "تذكير بموعد الدواء",
    "type": "medication"
  }
  ```

### Get User Notifications

- **URL**: `/notifications/:userId`
- **Method**: `GET`

### Mark as Read

- **URL**: `/notifications/:id/read`
- **Method**: `PATCH`

---

## 5. Residents (`/residents`)  — US-03-02

All resident endpoints are facility-scoped: the `facilityId` is always read from
the authenticated user's JWT token (`custom:facilityId`), never from the URL or
body. Cross-facility access is blocked at the query level.

### Create Resident (Admin only)

- **URL**: `/residents`
- **Method**: `POST`
- **Security**: JWT + Admin role
- **Payload**:
  ```json
  {
    "firstName": "Ahmad",
    "lastName": "Al-Rashid",
    "dateOfBirth": "1940-03-15",
    "gender": "male",
    "nationalId": "1234567890",
    "roomNumber": "101",
    "admissionDate": "2025-01-10",
    "status": "active",
    "notes": "Needs wheelchair assistance"
  }
  ```
- **Success Response (201 Created)**: The full resident object with `id`, `facilityId`, timestamps.

### List Residents

- **URL**: `/residents`
- **Method**: `GET`
- **Security**: JWT (any authenticated user)
- **Query Parameters**:
  - `status` (optional): `active` | `discharged` | `deceased`
- **Success Response (200 OK)**: Array of resident objects for the caller's facility.

### Get Single Resident

- **URL**: `/residents/:id`
- **Method**: `GET`
- **Security**: JWT (any authenticated user)
- **Success Response (200 OK)**: Single resident object.
- **Error Response (404)**: Resident not found (or belongs to another facility).

### Update Resident (Admin only)

- **URL**: `/residents/:id`
- **Method**: `PATCH`
- **Security**: JWT + Admin role
- **Payload**: Partial resident object (only fields to update):
  ```json
  {
    "roomNumber": "202",
    "status": "discharged",
    "dischargeDate": "2025-06-01"
  }
  ```
- **Success Response (200 OK)**: Updated resident object.
- **Error Response (404)**: Resident not found (or belongs to another facility).

---

## Swagger UI

Interactive API documentation is available at:
- **URL**: `/api/docs`
- All endpoints are documented with request/response schemas.
