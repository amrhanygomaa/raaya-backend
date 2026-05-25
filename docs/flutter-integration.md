# Flutter Integration Guide — Raaya Backend

This document explains how to connect a Flutter mobile application to the Raaya
Backend API hosted on AWS.

## 1. Architecture Overview

```
Flutter App (Android / iOS)
    │
    ├── Login ──► AWS Cognito ──► JWT Token
    │
    ├── API Calls ──► EC2:3000 (Authorization: Bearer <JWT>)
    │   ├── GET  /residents
    │   ├── GET  /medications/schedules
    │   ├── GET  /medications/overdue
    │   ├── GET  /medications/adherence?period=weekly
    │   ├── GET  /health/vitals?residentId=<id>
    │   ├── GET  /health/alerts
    │   ├── POST /ai/chat
    │   ├── GET  /ai/recommendations/<residentId>
    │   ├── GET  /ai/memory/<residentId>
    │   ├── POST /ai/memory/<residentId>
    │   ├── GET  /family-bridge/media?residentId=<id>
    │   ├── GET  /family-bridge/visits
    │   ├── GET  /complaints
    │   ├── GET  /admin/users
    │   ├── GET  /admin/settings
    │   ├── GET  /notifications/<userId>
    │   ├── PATCH /notifications/<id>/read
    │   └── GET  /kpi/dashboard
    │
    └── S3 Media ──► Presigned URLs returned by backend
```

---

## 2. Required Flutter Packages

Add the following to `pubspec.yaml`:

```yaml
dependencies:
  http: ^1.2.0
  amazon_cognito_identity_dart_2: ^3.6.0
  shared_preferences: ^2.2.0
  provider: ^6.1.0          # or riverpod / bloc
```

Run:

```bash
flutter pub get
```

---

## 3. Configuration

```dart
// lib/config/api_config.dart

class ApiConfig {
  /// Backend base URL — change per environment.
  ///
  /// Android Emulator  → http://10.0.2.2:3000
  /// iOS Simulator     → http://localhost:3000
  /// Real device / Prod → https://api.helpers-tech.com
  static const String baseUrl = 'https://api.helpers-tech.com';

  /// AWS Cognito identifiers (from the demo User Pool).
  static const String cognitoUserPoolId = 'us-east-1_XXXXXXXX';
  static const String cognitoClientId   = 'xxxxxxxxxxxxxxxxxxxxxxxxx';
  static const String cognitoRegion     = 'us-east-1';
}
```

> **Important**: Replace the Cognito placeholders with the actual values from
> the AWS Console → Cognito → User Pools → App Client.

---

## 4. Auth Service (Cognito)

```dart
// lib/services/auth_service.dart

import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class AuthService {
  final CognitoUserPool _userPool = CognitoUserPool(
    ApiConfig.cognitoUserPoolId,
    ApiConfig.cognitoClientId,
  );

  CognitoUserSession? _session;

  /// Sign in and return the JWT ID token.
  Future<String> login(String email, String password) async {
    final user = CognitoUser(email, _userPool);
    final authDetails = AuthenticationDetails(
      username: email,
      password: password,
    );

    _session = await user.authenticateUser(authDetails);
    final token = _session!.getIdToken().getJwtToken()!;

    // Persist token locally
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);

    return token;
  }

  /// Retrieve stored token.
  Future<String?> getStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  /// Log out and clear stored token.
  Future<void> logout() async {
    _session = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
  }
}
```

---

## 5. API Service

```dart
// lib/services/api_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiService {
  String? _token;

  void setToken(String token) => _token = token;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  // ──────────────────────────── Health ────────────────────────────

  Future<Map<String, dynamic>> healthCheck() async {
    final res = await http.get(Uri.parse('${ApiConfig.baseUrl}/health'));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ──────────────────────────── Auth ────────────────────────────

  Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/auth/me'),
      headers: _headers,
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ──────────────────────────── Residents ────────────────────────────

  Future<List<dynamic>> getResidents({String? status}) async {
    final query = status != null ? '?status=$status' : '';
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/residents$query'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<Map<String, dynamic>> getResident(String id) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/residents/$id'),
      headers: _headers,
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ──────────────────────────── Medications ────────────────────────────

  Future<List<dynamic>> getMedicationSchedules() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/medications/schedules'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<List<dynamic>> getOverdueMedications() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/medications/overdue'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<dynamic> getAdherenceReport({String period = 'weekly'}) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/medications/adherence?period=$period'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  // ──────────────────────────── Health Vitals ────────────────────────────

  Future<List<dynamic>> getVitals(String residentId) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/health/vitals?residentId=$residentId'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<List<dynamic>> getAlerts() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/health/alerts'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  // ──────────────────────────── AI Companion ────────────────────────────

  Future<Map<String, dynamic>> getRecommendations(String residentId) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/ai/recommendations/$residentId'),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendChatMessage({
    required String message,
    required String residentName,
    String? residentId,
    String language = 'ar-eg',
    List<Map<String, String>>? conversationHistory,
  }) async {
    final body = <String, dynamic>{
      'message': message,
      'residentName': residentName,
      'language': language,
    };
    if (residentId != null) body['residentId'] = residentId;
    if (conversationHistory != null) {
      body['conversationHistory'] = conversationHistory;
    }

    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/ai/chat'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getResidentMemory(String residentId) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/ai/memory/$residentId'),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> saveResidentMemory(
    String residentId,
    List<String> memory,
  ) async {
    final res = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/ai/memory/$residentId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'memory': memory}),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ──────────────────────────── Family Bridge ────────────────────────────

  Future<List<dynamic>> getMedia(String residentId) async {
    final res = await http.get(
      Uri.parse(
          '${ApiConfig.baseUrl}/family-bridge/media?residentId=$residentId'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<List<dynamic>> getVisits() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/family-bridge/visits'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  // ──────────────────────────── Complaints ────────────────────────────

  Future<List<dynamic>> getComplaints() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/complaints'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  // ──────────────────────────── Admin ────────────────────────────

  Future<List<dynamic>> getAdminUsers() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/admin/users'),
      headers: _headers,
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<Map<String, dynamic>> getFacilitySettings() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/admin/settings'),
      headers: _headers,
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ──────────────────────────── Notifications ────────────────────────────

  Future<List<dynamic>> getNotifications(String userId) async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/notifications/$userId'),
    );
    return jsonDecode(res.body) as List<dynamic>;
  }

  Future<Map<String, dynamic>> markNotificationAsRead(String id) async {
    final res = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/notifications/$id/read'),
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ──────────────────────────── KPI ────────────────────────────

  Future<Map<String, dynamic>> getKpiDashboard() async {
    final res = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/kpi/dashboard'),
      headers: _headers,
    );
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
```

---

## 6. Usage Examples

### Login and fetch residents

```dart
final auth = AuthService();
final api  = ApiService();

// Login
final token = await auth.login('nurse@raaya.demo', 'Password123!');
api.setToken(token);

// Fetch residents
final residents = await api.getResidents(status: 'active');
for (final r in residents) {
  print('${r['firstName']} ${r['lastName']} — Room ${r['roomNumber']}');
}
```

### AI Chat Screen

```dart
// Send message
final response = await api.sendChatMessage(
  message: 'أنا حاسس بشوية تعب اليوم',
  residentName: 'أحمد',
  residentId: 'a1b2c3d4-0000-0000-0000-000000000001',
  language: 'ar-eg',
);

// Display reply
print(response['reply']);        // رد الرفيق الذكي
print(response['sentiment']);    // positive / negative / neutral
print(response['disclaimer']);   // إخلاء المسؤولية الطبية
print(response['mode']);         // bedrock / local-fallback
```

### Medication Alerts

```dart
final overdue = await api.getOverdueMedications();
for (final dose in overdue) {
  showNotification('تذكير: ${dose['drugName']} — ${dose['residentName']}');
}
```

### Vital Signs Dashboard

```dart
final vitals = await api.getVitals('a1b2c3d4-0000-0000-0000-000000000001');
final alerts = await api.getAlerts();
// Build charts and alert cards in Flutter UI
```

---

## 7. Error Handling

All API calls should handle common HTTP errors:

```dart
Future<T> safeApiCall<T>(Future<T> Function() call) async {
  try {
    return await call();
  } on http.ClientException {
    throw Exception('Network error — check your connection');
  } catch (e) {
    if (e.toString().contains('401')) {
      // Token expired → redirect to login
      throw Exception('Session expired — please login again');
    }
    if (e.toString().contains('403')) {
      throw Exception('Access denied — insufficient permissions');
    }
    rethrow;
  }
}
```

---

## 8. Android Network Configuration

For Android local development only, allow cleartext HTTP to emulator hosts.
Production should use `https://api.helpers-tech.com` and must not allow the
old EC2 demo IP.

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">localhost</domain>
  </domain-config>
</network-security-config>
```

Reference it in `AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

For iOS, add to `ios/Runner/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

> **Production note**: Use HTTPS with a domain name and SSL certificate instead
> of allowing cleartext HTTP.

---

## 9. Security Checklist

| Check | Status |
|-------|--------|
| JWT stored securely (SharedPreferences / Keychain) | Required |
| Token refresh before expiry | Recommended |
| HTTPS in production | Required |
| No secrets in Flutter source code | Required |
| EC2 Security Group allows Flutter device IP on port 3000 | Required |
| Cognito App Client configured for mobile flow | Required |

---

## 10. Backend Endpoints Reference

Full API documentation: [`docs/api.md`](api.md)

Interactive Swagger UI: `http://<BACKEND_URL>:3000/api/docs`
