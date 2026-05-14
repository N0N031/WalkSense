# CLAUDE.md — WalkSense / GeoSense

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
