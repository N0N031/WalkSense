import os

# === COPILOT INSTRUCTIONS ===
copilot = r"""# WalkSense — Copilot Instructions

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
"""

# === CLAUDE.md ===
claude = r"""# CLAUDE.md — WalkSense / GeoSense

## Contexte developpeur
- Arnaud N., solo dev
- Projet : WalkSense V1.0 (branche GeoSense)
- Stack : Expo 54 / RN 0.81 / TypeScript strict / SQLite
- Objectif : stabiliser V1.0 -> test terrain -> beta 10 users

## Etat actuel (mai 2026)
- V1.0 fonctionnel a 75-80%
- FONCTIONNEL : Sessions, GPS, marqueurs, photos, export, auth, hash, 8 couches carte
- BUG : Distance cumul = 0m possible (useGps -> explore.tsx)
- BUG : TopHud.tsx doublon non nettoye
- BUG : Types GpsPoint dupliques (types/index.ts vs sessionService.ts)

## Regles absolues
- Offline-first (zero cloud V1)
- TypeScript strict (zero any)
- Pas de feature V2 avant V1 stable
- Sessions verrouillee = immuables
- Source de verite types : sessionService.ts

## Roadmap
- V1.0 : stabilite + test terrain (MAINTENANT)
- V1.5 : mode groupe
- V2.0 : cloud sync
- V2.5 : coverage grid + IFT
- V3+ : MapSense / RockSense hardware

## Monetisation
- Gratuit total V1
- Premium 2,99 euros/mois des V2 (export PDF, cloud backup)
- Objectif net : 2500-3000 euros/mois (Y2-Y3)

## Brief Claude
Commencer chaque conversation par :
"Contexte CLAUDE.md charge. Sprint en cours : [NOM DU SPRINT]"
"""

# === CODEX PROMPT ===
codex = r"""# Template Codex — WalkSense

## Coller en debut de chaque session Codex

---
PROJET : WalkSense — Expo 54 / RN 0.81 / TypeScript strict / SQLite local-first

REGLES :
- Offline-first, zero cloud V1
- Types source : src/services/sessionService.ts
- Pas de any, pas de @ts-ignore
- Pas de feature hors scope V1.0

SCOPE V1.0 :
GPS + sessions + marqueurs + photos + export JSON/GPX + auth + hash SHA-256

HORS SCOPE V1.0 :
groupe, cloud, grid, BLE reel, IFT, analytics, push notifications

TACHE : [DECRIRE ICI]
FICHIER(S) CONCERNE(S) : [LISTER ICI]
COMPORTEMENT ATTENDU : [DECRIRE ICI]
COMPORTEMENT ACTUEL : [DECRIRE ICI]
---
"""

# === ECRITURE DES FICHIERS ===
os.makedirs(".github", exist_ok=True)
os.makedirs("docs/dev", exist_ok=True)

with open(".github/copilot-instructions.md", "w", encoding="utf-8") as f:
    f.write(copilot)

with open("CLAUDE.md", "w", encoding="utf-8") as f:
    f.write(claude)

with open("docs/dev/CODEX_PROMPT.md", "w", encoding="utf-8") as f:
    f.write(codex)

print("OK .github/copilot-instructions.md")
print("OK CLAUDE.md")
print("OK docs/dev/CODEX_PROMPT.md")
print("TERMINE — 3 fichiers crees")
