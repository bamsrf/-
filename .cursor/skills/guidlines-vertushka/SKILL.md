text
# Mobile App Development Rules (React Native + Expo + NestJS)

## General Guidelines
- Responses must be concise. Prioritize code.
- No conversational filler or unnecessary explanations.
- Leave NO todos, placeholders, or missing pieces.
- Fully implement all requested functionality.
- When you finish applying changes, the last line should say "Don't forget to commit!" with a commit command.

## TypeScript Standards
- Always declare types for variables, function parameters, and return values.
- Use interfaces instead of types.
- Avoid enums - use maps instead.
- Avoid `any` - create necessary types.
- Use strict TypeScript mode for type safety.
- Default parameter values instead of null/undefined checks.
- PascalCase for classes, camelCase for variables/functions, kebab-case for files/directories.
- All TypeScript types stored in lib/types.ts.

## Functions
- Keep functions short with single purpose (< 20 instructions).
- Use early returns for error checks.
- For multiple parameters/results, use object pattern (RO-RO).

## React Native + Expo (Mobile Frontend)
- Functional TypeScript patterns, avoid classes.
- File structure: exported component → subcomponents → helpers → static content → types.
- Directory structure: lowercase with dashes (`components/auth-wizard`).
- Named exports for components.
- Minimize useState/useEffect - prefer Zustand stores.

### Project Structure
- `app/` directory for screens with Expo Router file-based navigation.
- Route groups: `(auth)/` for authentication, `(tabs)/` for main tabs.
- `components/` for UI components: `ui/` subfolder for base components, feature components in root.
- `lib/` for business logic: api.ts, store.ts, types.ts.
- `constants/` for theme and design system (theme.ts).

### State Management & API
- Zustand for global state management (stores in lib/store.ts).
- Axios for HTTP client (centralized in lib/api.ts).
- API base URL configuration in lib/api.ts with __DEV__ check for development/production environments.
- No react-query - use Zustand + Axios pattern.

### UI & Styling
- Use built-in Expo components for UI patterns.
- Responsive design via Flexbox and `useWindowDimensions`.
- SafeAreaProvider and SafeAreaView for iOS/Android notches.
- Dark mode support via `useColorScheme`.
- Theme constants from constants/theme.ts.
- Minimize inline styles - prefer consistent theme-based styling.

### Performance
- Optimize images: WebP format, lazy loading with expo-image.
- Code splitting with React Suspense and dynamic imports.
- Minimize re-renders with proper Zustand selectors.
- Use memoization where appropriate (useMemo, useCallback).

### Navigation
- Expo Router for file-based routing.
- Dynamic routes with [id] pattern (e.g., record/[id].tsx).
- Modal screens outside route groups.

### Expo-Specific
- expo-camera for barcode scanning functionality.
- Expo SDK 52 compatibility - check docs for breaking changes.
- Use npx eas build for production builds.

## NestJS (Backend)
- Modular structure: one module per domain/route.
- One controller per route + additional for secondary routes.
- Models folder with DTOs (class-validator for input) and plain types for output.
- Services with business logic and persistence (one service per entity).
- Common module (`@app/common`) for shared code: configs, decorators, DTOs, guards, interceptors, services, utils, validators.
- JSDoc for public classes and methods.
- Jest unit tests for each controller and service.
- E2E tests for each API module.
- Arrange-Act-Assert convention for tests.

## Error Handling
- Implement proper error handling on both frontend and backend.
- User-friendly error messages on frontend.
- Structured error responses from backend API.
- Network error handling in Axios interceptors.---
name: guidlines-vertushka
description: This is a new rule
---

# Overview

Insert overview text here. The agent will only see this should they choose to apply the rule.
