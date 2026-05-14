# WalkSense — Copilot Instructions

## Projet
Application mobile React Native / Expo — tracking GPS terrain pour prospecteurs.
Branche de l'écosystème GeoSense (Arnaud N.).

## Stack STRICTE
- Expo SDK 54 + Expo Router 6
- React Native 0.81 + React 19
- TypeScript STRICT (pas de any, pas de as unknown)
- SQLite via expo-sqlite (local-first, pas de cloud V1)
- Maps : react-native-maps
- Crypto : expo-crypto (SHA-256)
- Auth : expo-secure-store + expo-local-authentication

## Règles absolues
- Offline-first : zéro appel réseau sauf geocodingService (Nominatim)
- Pas de Zustand, pas de Redux — Context + hooks métier uniquement
- Pas de coverage grid (prévu V2.5 uniquement)
- TypeScript strict : pas de @ts-ignore
- Sessions immuables après lockedAt (hash SHA-256)

## Structure
app/          Expo Router (tabs: index, explore, map)
src/
  components/ Composants UI réutilisables
  hooks/      useGps, useSession, useTimer, useBle
  services/   sessionService, authService, geocodingService, bleService
  data/       db.ts (SQLite), sessionRepository
  utils/      distance.ts (haversine), sha256
  constants/  colors.ts, branding.ts
  types/      index.ts

## Types clés (source de vérité = sessionService.ts)
- GpsPoint, Session, MarkedEvent

## Bugs connus V1.0
- Distance cumul peut rester a 0 (useGps -> explore.tsx)
- TopHud.tsx doublon (SessionHud = version utilisee)
- hello-wave.tsx inutile (starter Expo)

## V1.0 scope UNIQUEMENT
GPS tracking + sessions + marqueurs + photos + export JSON/GPX
Auth passcode + biometrie + 8 couches carto + hash SHA-256

## HORS V1.0 (ne jamais implementer)
Mode groupe / Cloud sync / Coverage grid / BLE reel / IFT score
