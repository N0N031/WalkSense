# WalkSense V1.0 — Checklist validation terrain Android

Objectif : valider WalkSense sur un vrai device Android, dehors, avec GPS reel et stockage local. Cette checklist ne valide pas une simulation web, un backend, ni un flux cloud.

## 1. Preparation device

- [ ] Installer une build Android recente de WalkSense sur device physique.
- [ ] Verifier que le mode avion est desactive, mais que WalkSense reste utilisable sans Wi-Fi.
- [ ] Autoriser la localisation precise pour WalkSense.
- [ ] Autoriser l'acces camera/photos si le test inclut une photo de marqueur.
- [ ] Ouvrir WalkSense apres un redemarrage complet de l'app.
- [ ] Confirmer qu'aucune connexion backend Flask/Python/FastAPI n'est requise.

## 2. GPS live avant session

- [ ] Ouvrir l'onglet Explore dehors, ciel suffisamment degage.
- [ ] Attendre un signal GPS exploitable.
- [ ] Verifier que l'indicateur GPS affiche une precision coherente.
- [ ] Verifier que le bouton de demarrage reste bloque si le signal est insuffisant.
- [ ] Verifier que la carte centre correctement la position utilisateur.

## 3. Demarrage session

- [ ] Demarrer une session avec GPS disponible.
- [ ] Verifier que le timer demarre.
- [ ] Verifier que la distance commence a 0 m puis augmente pendant la marche.
- [ ] Verifier que `SessionMap.native.tsx` affiche la trace sans freeze ni carte vide.
- [ ] Ajouter un marqueur manuel sur la position courante.
- [ ] Verifier que le marqueur apparait dans la carte et dans la bottom sheet.

## 4. Pause, reprise, distance

- [ ] Marcher au moins 30 metres avec la session active.
- [ ] Mettre la session en pause.
- [ ] Verifier que la distance affichee ne retombe pas a 0 m.
- [ ] Fermer puis rouvrir l'app pendant la pause.
- [ ] Verifier que la session courante et sa distance sont restaurees.
- [ ] Reprendre la session.
- [ ] Marcher a nouveau au moins 30 metres.
- [ ] Verifier que la distance totale continue depuis la valeur deja acquise.

## 5. Autosave local-first

- [ ] Pendant une session active, couper le Wi-Fi et les donnees mobiles.
- [ ] Ajouter un marqueur.
- [ ] Classer le marqueur avec une note courte.
- [ ] Fermer l'app brutalement depuis le switcher Android.
- [ ] Rouvrir WalkSense.
- [ ] Verifier que la session, la trace GPS, la distance et le marqueur sont toujours presents.
- [ ] Verifier qu'aucune erreur reseau ne bloque l'usage.

## 6. RAW/FILTERED et redFilter

- [ ] Ajouter au moins deux marqueurs.
- [ ] Classer un marqueur et laisser l'autre non classe.
- [ ] Activer le filtre rouge / non classes.
- [ ] Verifier que seuls les evenements sans classification restent visibles dans la bottom sheet.
- [ ] Verifier que le compteur compact respecte le filtre.
- [ ] Desactiver le filtre.
- [ ] Verifier que tous les evenements reviennent.
- [ ] Confirmer que les donnees RAW ne sont pas supprimees par l'affichage FILTERED.

## 7. Fin de session et verrouillage

- [ ] Terminer la session.
- [ ] Verifier que la distance finale est conservee.
- [ ] Verifier que la trace GPS et les marqueurs restent consultables.
- [ ] Verifier qu'une session terminee ne continue pas a recevoir de nouveaux points GPS.
- [ ] Verifier qu'une nouvelle session repart proprement sans heriter du GPS live precedent.

## 8. Criteres de validation V1 terrain

- [ ] Aucun crash sur le parcours complet.
- [ ] Distance non nulle apres pause, reprise et redemarrage app.
- [ ] GPS live stable sur device reel.
- [ ] Trace native visible et coherente.
- [ ] Autosave SQLite confirme hors ligne.
- [ ] RAW/FILTERED clair et non destructif.
- [ ] Aucun backend requis.

## Notes de test

- Device :
- Version Android :
- Build WalkSense :
- Lieu/date :
- Distance approximative terrain :
- Resultat : PASS / FAIL
- Anomalies observees :
