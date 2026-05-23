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
1. Lire `/ai-stack/gbrain/memory/handoff.md`
2. Annoncer : "Handoff lu. Session précédente : [agent] | Tâche : [tâche] | Prochaine action : [action exacte]"
3. Proposer de reprendre ou de changer de tâche

## Protocole handoff (écriture obligatoire)
Après chaque fichier modifié, mettre à jour `/ai-stack/gbrain/memory/handoff.md` :
- Ajouter le fichier dans "Fichiers modifiés cette session"
- Cocher [x] les étapes terminées, marquer [⚡] l'étape en cours
- Mettre à jour "Prochaine action exacte" avec fichier + fonction + objectif précis
- Mettre à jour "Décisions non visibles dans le code" si décision prise

Règle : le handoff doit permettre à Codex de reprendre sans poser de question.

## Orchestration IA locale
- walksense-coder (Ollama) : `curl http://localhost:11434/api/generate -d '{"model":"walksense-coder",...}'`
- Déléguer à walksense-coder : génération focalisée >30 lignes, audit de diff ciblé
- Ne jamais déléguer : GPS/session logic, auth, architecture multi-fichiers
- Régénérer walksense-coder après gbrain update : `bash /ai-stack/scripts/update-walksense-coder.sh`
- Gates TSC : utiliser node + typescript du projet (les path aliases @/ nécessitent le tsconfig)

## Installation IA locale
- Tout le flux IA local doit rester 100% local.
- Ne jamais utiliser ni afficher de vraie cle `sk-ant`.
- Variables attendues pour le mode local dedie :
  - `ANTHROPIC_BASE_URL=http://127.0.0.1:11434`
  - `ANTHROPIC_API_KEY=sk-local`
- Ollama est le LLM local.
- Modele local courant : `qwen2.5-coder:1.5b`.
- Claude Code local est une interface possible, pas la source de verite.
- Si Claude Code direct vers Ollama echoue, verifier la compatibilite Anthropic ou utiliser un proxy compatible.

## Stack officielle
- Expo SDK 54.
- React Native / React 19.
- TypeScript strict.
- Expo Router.
- `expo-sqlite` local-first.
- `expo-location`.
- `react-native-maps`.
- `expo-crypto` SHA-256.
- AsyncStorage.
- Android-first, offline-first, privacy-first.

## Regles absolues WalkSense
- Ne jamais transformer WalkSense en backend Flask/Python.
- Python, Ollama et Gbrain sont uniquement des outils locaux auxiliaires.
- Ne pas installer Docker pour ce flux local.
- Ne pas refondre l'app sans demande explicite.
- Ne pas modifier le code mobile pour une tache d'installation IA locale.
- Garder SQLite et l'app Expo comme coeur officiel.

## Priorite GPS
- Stabiliser GPS live.
- Surveiller `useGps.ts`.
- Surveiller `app/(tabs)/explore.tsx`.
- Surveiller `SessionMap.native.tsx`.
- Garantir autosave et persistence locale.
- Distinguer clairement RAW et FILTERED.

## Doctrine produit
- WalkSense doit rester utile sur le terrain, sans cloud obligatoire.
- Les donnees locales et la confiance utilisateur priment.
- Les sessions verrouillees doivent rester immuables.
- Les changements doivent etre petits, testables et documentes.

## IFT
- IFT couvre qualite documentaire, coherence GPS, anti-cheat et scores session/global.
- STOP/WALK/BIKE/CAR releve du mobility analyzer.
- STOP/WALK/BIKE/CAR ne constitue pas un IFT complet.
- Toute logique IFT doit etre explicable et verifiable.

## Anti-cheat IFT
- Detecter incoherences GPS, sauts suspects, vitesses impossibles et preuves documentaires faibles.
- Ne pas penaliser sans signal explicable.
- Preferer des scores auditables a des boites noires.

## MapSense et Geo-Fusion
- MapSense est une evolution cartographique, pas une obligation V1.
- Geo-Fusion doit consolider les signaux terrain sans casser le local-first.
- Toute evolution doit respecter la stabilite V1 avant extension.

## GBRAIN
- Memoire locale attendue : `A:\ai-stack\gbrain`.
- Jonction repo attendue : `.gbrain`.
- Gbrain conserve contexte, decisions, agents et changelog local.
- Gbrain n'est pas une base de donnees applicative WalkSense.

## Workflow
1. Plan court.
2. Code minimal.
3. Test cible.
4. Documentation locale si pertinent.

## Commandes de validation
- `ollama list`
- `Invoke-RestMethod http://127.0.0.1:11434/api/tags`
- `Get-ChildItem Env:ANTHROPIC*`
- `Get-Command claude -ErrorAction SilentlyContinue`
- `Test-Path .gbrain\memory\project_state.md`
- `npm run lint`
