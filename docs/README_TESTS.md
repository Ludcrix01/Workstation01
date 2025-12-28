# Guide pour l'environnement de test (MJWorkHub)

Ce document explique en français comment configurer et utiliser l'environnement de tests pour la page web MJWorkHub (unitaires + E2E).

Pré-requis
- Node.js (v18+ ou v20 recommandé)
- npm

Installation
1. Ouvrir un terminal à la racine du projet (`C:\MJWorkHub`).
2. Installer les dépendances :

```bash
npm ci
```

Tests unitaires (Jest + React Testing Library)
---------------------------------------------
- Commande :

```bash
npm test
```

- Exécution en mode watch :

```bash
npm run test:watch
```

- Les tests se trouvent sous `frontend/src/**/*.test.*`.
- `frontend/src/tests/setupTests.ts` configure `@testing-library/jest-dom`.
- Bonnes pratiques pour tests de tracking :
  - Simuler `document.visibilityState = 'visible'` et `jest.spyOn(document, 'hasFocus').mockReturnValue(true)` pour simuler focus.
  - Mock `fetch` ou utiliser `msw` (Mock Service Worker) pour intercepter les appels réseau.
  - Utiliser `jest.useFakeTimers()` pour avancer le temps et valider la fin de session après inactivité.

Tests E2E (Cypress)
-------------------
- Commandes :

```bash
npm run cypress:open   # interface interactive
npm run cypress:run    # headless
```

- Assurez-vous que votre app tourne localement (par défaut `http://localhost:3000`) avant de lancer Cypress.
- Exemples de scénarios à couvrir :
  - Interaction normale (clics, inputs) déclenche `start-session` et `post-events`.
  - Onglet en arrière-plan ne doit pas déclencher de sessions.
  - Iframe Excel visible sans interaction ne doit pas entraîner de session Excel.
  - Mouse mover : mouvements sans clicks ne doivent pas augmenter le temps.

Tests d'intégrité et anti-contournement
--------------------------------------
- Vérifier que les événements envoyés incluent un token nonce ou signature HMAC.
- Créer des tests simulant patterns réguliers (ex : intervalle parfait) et s'assurer que le serveur marque la session comme suspecte.

CI (GitHub Actions)
-------------------
- Un workflow d'exemple est présent dans `.github/workflows/ci.yml`. Il exécute `npm test` puis `npm run cypress:run` (nécessite que l'app soit démarrée dans le job ou qu'un service soit utilisé).

Notes spécifiques pour tests sur page web
---------------------------------------
- Pour tester le composant Excel en iframe :
  - Fournir un stub d'iframe qui envoie des `postMessage` signés au parent simulant `cellEdit` et `save`.
  - Dans Cypress, vous pouvez intercepter ces messages ou fournir une iframe de test qui émet les messages.

- Pour valider qu'aucune donnée sensible n'est collectée :
  - Créer assertions qui vérifient que le payload d'un `keydown` ne contient pas la valeur de la touche, uniquement l'événement "keydown".

FAQ courte
- Q: Comment tester le cas "onglet en arrière-plan" ?
  - R: Dans unit tests, modifier `document.visibilityState` et s'assurer que `start-session` n'est pas appelé. En E2E, c'est plus délicat mais on peut simuler blur/focus.

Support
- Si vous voulez, je peux créer :
  - Exemple de test MSW pour simuler le backend.
  - Script d'exemple pour démarrer une page de test locale servant une UI minimale pour Cypress.
