# WalkSense

Application mobile de tracking et exploration de terrain pour détecteurs amateurs.

**Branche du projet GeoSense** — pilier WalkSense (terrain).

## Statut

🚧 WIP — V1.0 MVP en développement (M1, mai 2026).

## Stack

- Expo SDK 54 + Expo Router 6
- React Native 0.81 + React 19
- TypeScript strict
- Storage local-first : expo-sqlite (sessions/points GPS) + AsyncStorage (préférences)
- Hash session : SHA-256 via expo-crypto
- Cartographie : react-native-maps

## Démarrage

```bash
npm install
npx expo start
```

## Configuration EAS

Les builds Android EAS ont besoin d'une cle Google Maps Android dans
`GOOGLE_MAPS_ANDROID_API_KEY`. La valeur doit etre une cle Android valide
creee dans Google Cloud, avec l'API Maps SDK for Android activee.

Pour un build APK ou production, ajoute la variable dans l'environnement EAS
utilise par le profil:

```bash
npx eas-cli@latest env:create --environment production --name GOOGLE_MAPS_ANDROID_API_KEY --value <AIza...> --visibility sensitive
```

Les profils `apk` et `production` utilisent actuellement l'environnement
`production`. Le profil `preview` utilise `preview`, et `development` utilise
`development`.

En local, copie `.env.example` vers `.env.local` ou `.env`, puis renseigne la
cle. Les fichiers `.env` locaux sont ignores par Git.

## Architecture

```text
/app/             Routing Expo Router (file-based)
/src/
  components/     Composants réutilisables
  hooks/          Hooks métier (useGps, useSession...)
  services/       Logique métier (gpsService, hashService...)
  types/          Types TypeScript partagés
  constants/      Constantes (couleurs, config)
  utils/          Helpers
/assets/          Images, fonts, icônes
```

## Confidentialité

Documents stratégiques (référentiel GeoSense, blueprints, cahiers des charges)
NE doivent PAS être committés dans ce repo. Voir .gitignore.
