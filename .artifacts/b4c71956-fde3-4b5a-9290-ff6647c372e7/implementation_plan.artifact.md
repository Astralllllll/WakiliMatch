# Conversion Strategy: Web Stack (React/Vite/Node.js) to Mobile App

This plan outlines the architectural approaches and steps required to convert the existing "WakiliMatch" web application stack into a mobile app (targeting Android).

## User Review Required

> [!IMPORTANT]
> **Choose Your Mobile App Architecture:**
> 1. **Capacitor / WebView Wrapper (Recommended for fastest conversion):** Keeps your existing React + Vite frontend code intact and packages it into an Android app shell using Capacitor. The Node.js/Express backend remains as a remote API server.
> 2. **Native Android App (Jetpack Compose + Kotlin):** Rebuilds the frontend natively using modern Android UI (Jetpack Compose & Material 3), consuming your existing Node.js REST API endpoints.
> 3. **React Native / Expo:** Migrates React code to mobile-native components using React Native.

## Open Questions

- Would you prefer a **Capacitor WebView wrapper** (reusing your exact React UI code) or a **Native Android / Kotlin (Jetpack Compose)** rewrite?
- Is the Node.js backend hosted on a cloud server (e.g., Render, Heroku, AWS), or should we provision local API access for development?

## Proposed Changes

### [Architecture Selection & Setup]
- Determine and validate the chosen mobile framework (Capacitor vs Native Kotlin vs React Native).
- Set up Android project structure and dependencies.

### [Backend Integration]
- Ensure Node.js/Express REST APIs (`server.js`, `routes/`) are CORS-enabled and accessible from mobile clients.
- Configure environment variables (`.env`) for mobile API base URLs.

### [Frontend / UI Adaptation]
- **If Capacitor:** Add Capacitor configuration (`capacitor.config.json`), build frontend assets (`vite build`), and sync with the Android platform.
- **If Native Kotlin:** Implement screens in Jetpack Compose mirroring the React features (Lawyer matching, profiles, issues, admin dashboard).

## Verification Plan

### Automated Tests
- Build verification (`npm run build` or Gradle build).
- API endpoint health checks.

### Manual Verification
- Deploying and running the mobile app on an Android emulator or physical device using ADB.
