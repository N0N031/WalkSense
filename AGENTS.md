# AGENTS.md — WalkSense / GeoSense
# Instructions pour Codex CLI et tout agent non-Claude reprenant le travail

## PREMIÈRE ACTION OBLIGATOIRE — AVANT TOUT

Sans attendre d'instruction de l'utilisateur, lire immédiatement :
```
cat /ai-stack/gbrain/memory/handoff.md
```
Puis annoncer :
"Handoff lu. Session précédente : [agent] | Tâche : [tâche] | Prochaine action : [action exacte]"
Puis demander : "Je reprends sur [action exacte] — confirme ou dis-moi quoi changer."

Ce fichier contient tout le contexte nécessaire. Ne pas relire le code tant que le handoff ne l'indique pas.

---

## Contexte projet

Application mobile Android-first, offline-first, privacy-first.
Stack officielle : Expo SDK 54 · React Native · TypeScript strict · Expo Router · expo-sqlite · expo-location · react-native-maps · expo-crypto · AsyncStorage.
Règles absolues : pas de backend Flask/Python · SQLite local uniquement · zero any TypeScript.

Fichier de référence complet : `CLAUDE.md` (même dossier).

---

## Mémoire projet (gbrain)

```
/ai-stack/gbrain/memory/handoff.md          ← LIRE EN PREMIER
/ai-stack/gbrain/memory/active_context.md   ← focus et changements récents
/ai-stack/gbrain/memory/feature_status_real.md ← état vérifié des features
/ai-stack/gbrain/memory/decisions.md        ← décisions architecturales
/ai-stack/gbrain/memory/project_state.md    ← état global projet
```

---

## Architecture IA locale disponible

**walksense-coder** (qwen2.5-coder:14b avec contexte WalkSense) :
```bash
curl -s http://localhost:11434/api/generate \
  -d '{"model":"walksense-coder","prompt":"...","stream":false}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['response'])"
```
Utiliser pour : génération de code focalisée, audit de diff ciblé.
Ne pas déléguer : logique GPS/session critique, architecture multi-fichiers.

**Gates de validation** (toujours lancer avant d'appliquer du code) :
```bash
# TypeScript (les imports @/ nécessitent le tsconfig du projet)
node -e "
const ts=require('/ai-stack/projects/walksense/node_modules/typescript');
const cfg=ts.readConfigFile('/ai-stack/projects/walksense/tsconfig.json',ts.sys.readFile);
const p=ts.parseJsonConfigFileContent(cfg.config,ts.sys,'/ai-stack/projects/walksense');
const prog=ts.createProgram(p.fileNames,p.options);
const d=ts.getPreEmitDiagnostics(prog);
console.log(d.length===0?'TSC: PASS':d.length+' erreurs');
"
# Lint
npm run lint --prefix /ai-stack/projects/walksense
```

---

## Protocole de handoff (écriture)

Après chaque fichier modifié, mettre à jour `/ai-stack/gbrain/memory/handoff.md` :
- Ajouter le fichier dans "Fichiers modifiés cette session"
- Cocher les étapes terminées [x]
- Marquer l'étape en cours [⚡]
- Mettre à jour "Prochaine action exacte"
- Changer Agent: en haut avec ton nom et l'heure

Si tu termines proprement (pas de quota), mettre Status: `COMPLÉTÉ` et vider "Prochaine action".

---

## Conventions code

- Zéro commentaires sauf WHY non-obvieux
- Changements minimaux — jamais réécrire un fichier entier
- Noms en anglais, messages UI en français
- Imports avec alias @/ (ex: `@/src/services/sessionService`)
- Tests : custom runner `runXxxTests()`, PAS Jest
