# Review.AI — Frontend

Interface de Review.AI : dépôt en masse, Command Center, Object View des transactions
(graphe d'impact), assistant contextuel.

Backend : [`review-ai-backend`](../review-ai-backend) — contrats API dans `src/lib/api.ts`.

## Démarrage

```bash
npm install
cp .env.example .env     # renseigner VITE_API_URL
npm run dev              # http://localhost:5173
```

Les appels `/api/*` sont proxifiés vers `VITE_API_URL` (voir `vite.config.ts`).

## Structure

```
src/
  pages/       écrans (Landing, Intake, …)
  components/  composants réutilisables
  lib/api.ts   client HTTP typé — miroir des contrats SPEC §99-105
  styles/      design tokens
docs/mockup.html   maquette complète animée (référence visuelle)
```

## Maquette de référence

`docs/mockup.html` contient la maquette complète et animée (landing, login, intake,
Object View). Elle sert de référence : porter les écrans en composants React
progressivement plutôt que de repartir de zéro.

## Thème

Thème sombre (SPEC §122, OPEN-05). Tous les tokens sont dans `src/styles/tokens.css` —
ne jamais coder une couleur en dur dans un composant.
