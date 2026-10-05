# 🛡️ Privacy Policy & Google Play Data Safety Guide — EquipTrack

This document details the telemetry practices in EquipTrack and provides an accurate, verifiable reference for Google Play Console Data Safety review and application privacy disclosures.

---

## 📋 1. Telemetry Policy Summary

EquipTrack collects minimal, anonymous application performance and operational diagnostic telemetry via PostHog to ensure high availability, detect runtime exceptions, and measure product feature adoption.

- **Host Region:** US Cloud (`https://us.i.posthog.com`)
- **Transport Security:** 100% TLS/HTTPS encryption in transit.
- **User Control:** Interactive in-app toggle (*Privacy & Analytics* dialog) allows users to opt out of telemetry at any time.

---

## 🔍 2. Data Collection Breakdown

### A. Data Categories Collected

| Category | Specific Data | Purpose | Optional / Required |
| :--- | :--- | :--- | :--- |
| **App Info & Performance** | Crash logs, unhandled Flutter error types, sanitized API status codes | App Functionality, Analytics | Optional (User can opt out in Settings) |
| **App Activity** | Screen navigation views, button interactions, report export format (PDF/Excel) | Analytics, Product Optimization | Optional |
| **User Identifiers** | Pseudonymous application user UUID (`user.id`) | Account Management, Analytics | Optional |
| **Device & OS Info** | Android OS version, platform architecture | Analytics, Compatibility | Optional |

### B. Data Categories Strictly NOT Collected

The codebase strictly excludes:
- ❌ **Passwords & Credentials** (Never transmitted or logged)
- ❌ **Authentication Tokens & JWTs** (Stripped by `AnalyticsProperties.sanitize`)
- ❌ **Precise / Coarse Location** (No location permissions requested)
- ❌ **Contacts, SMS, Phone Number** (No telephony permissions requested)
- ❌ **Microphone, Camera, Photos** (No media capture permissions requested)
- ❌ **Financial / Payment Information** (No payment info handled)
- ❌ **Advertising ID (AAID / GAID)** (Not collected or shared with ad networks)

---

## 📱 3. Android Permissions Verification

EquipTrack requests **no special permissions** for PostHog or analytics. The only network permission present in `android/app/src/main/AndroidManifest.xml` is:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
```
No background location, external storage, camera, contacts, or phone state permissions are requested.

---

## 📝 4. Google Play Console Data Safety Form Checklist

When submitting EquipTrack on Google Play Console under the **Data Safety** section:

1. **Does your app collect or share any of the required user data types?**
   - Select: **Yes**

2. **Is all of the user data collected by your app encrypted in transit?**
   - Select: **Yes** (all REST and PostHog calls use HTTPS).

3. **Do you provide a way for users to request that their data be deleted?**
   - Select: **Yes** (Users can delete accounts, records, or reset analytics).

4. **Data Types Disclosure**:
   - **App info and performance**:
     - *Crash logs*: Collected for Analytics / App Functionality.
     - *Diagnostics*: Collected for Analytics.
   - **App activity**:
     - *App interactions*: Collected for Analytics.
   - **User IDs**:
     - *User ID*: Pseudonymous internal database ID for Account / Analytics.

5. **Data Sharing**:
   - EquipTrack **does NOT sell user data** and does NOT share data with third-party advertising networks. Telemetry is processed solely by PostHog as a service provider / data processor.

---

## ⚙️ 5. In-App User Consent & Opt-Out

Users can toggle analytics collection at any time:
1. Tap the **Privacy Shield** icon in the app bar.
2. Toggle the **Share Anonymous Telemetry** switch.
3. When toggled OFF:
   - Consent state `AnalyticsConsent.denied` is persisted in `SharedPreferences`.
   - `Posthog().disable()` is immediately invoked.
   - All subsequent `track()`, `screen()`, and `captureError()` calls operate as immediate no-ops.
