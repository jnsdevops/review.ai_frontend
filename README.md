# Review.AI — Frontend

Interface de Review.AI : dépôt en masse, Command Center, Object View des transactions.

Backend : [`review-ai-backend`](../review-ai-backend) — contrats repris dans `src/lib/api.ts`.

## Démarrage

Deux terminaux, le backend d'abord :

```bash
cd ../review-ai-backend
source .venv/bin/activate
uvicorn backend.api.main:app --reload
```

Puis le frontend :

```bash
npm install
cp .env.example .env
npm run dev
```

- Interface : http://localhost:5173
- API : http://localhost:8000 — documentation interactive sur `/docs`

Les appels `/api/*` sont proxifiés vers `VITE_API_URL` (voir `vite.config.ts`),
et le backend autorise l'origine du serveur de développement.

## Déclarer les entités du cabinet

La résolution d'entité (§7) compare les documents déposés à une liste connue.
Sans elle, tout dossier ressort en `UNRESOLVED_ENTITY` — ce qui est le
comportement voulu : Review.AI ne rattache jamais au hasard.

```bash
curl -X POST http://localhost:8000/uploads/entities \
  -H "Content-Type: application/json" \
  -d '[{"entity_id":"e-alpha","legal_name":"ALPHA NEGOCE SARL","niu":"M071812345678A"}]'
```

## Structure

```
src/
  pages/       écrans (Landing, Intake, …)
  components/  composants réutilisables
  lib/api.ts   client HTTP typé — miroir des contrats du backend
  styles/      design tokens
docs/mockup.html   maquette complète animée (référence visuelle)
```

## Thème

Thème sombre (SPEC §122). Tous les tokens sont dans `src/styles/tokens.css` —
ne jamais coder une couleur en dur dans un composant.
