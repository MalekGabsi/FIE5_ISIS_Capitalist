# ISIS Capitalist — Football Empire

Adventure Capitalist–style incremental game.

- `backend/` — NestJS + GraphQL API, one JSON world per player in `backend/userworlds/`
- `frontend/` — Angular (signals) + Apollo + GraphQL Codegen

## HOW TO RUN

Terminal 1:

```bash
cd backend
npm install
npm run start:dev
```

Terminal 2:

```bash
cd frontend
npm install
npm run codegen
npm start
```

URLs:

- Backend GraphQL: http://localhost:3000/graphql
- Frontend: http://localhost:4200

The backend address can be changed in the app (sidebar → **Backend server**, press Enter); it is remembered in the browser.

## Checks

```bash
cd backend  && npm run build && npm test && npm run test:e2e
cd frontend && npm run codegen && npx ng test --watch=false && npx ng build
```

Backend ↔ frontend contract notes: [FRONTEND_BACKEND_INTEGRATION_NOTES.md](FRONTEND_BACKEND_INTEGRATION_NOTES.md)
