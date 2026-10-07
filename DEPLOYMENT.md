# Setup and deployment

## Local development

Requirements: Node.js 20.19 or newer and a reachable MongoDB database.

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and a private `JWT_SECRET`.
2. From the repository root, run `npm install` once.
3. Run `npm run dev` to start the API on port 3000 and Vite on port 5173.

The frontend defaults to `http://localhost:3000` for API requests in development. Set `VITE_API_BASE_URL` in `frontend/.env` only when the API uses a different address.

## Production on Render

The included `render.yaml` deploys the frontend and API as one Node web service. The backend serves the production `frontend/dist` build, so API calls stay same-origin and do not need a CORS URL.

1. Push the repository and create a Render Blueprint from it.
2. Set the prompted `MONGO_URI` to the production MongoDB connection string. Render generates `JWT_SECRET`.
3. Deploy. Render provides HTTPS, which is required for service workers and home-screen installation.

For a local production build, run `npm run build`, then `npm start`. The backend serves the built app when `frontend/dist` exists.

## Hosting frontend separately

For a static frontend host, build `frontend` with `VITE_API_BASE_URL` set to the HTTPS backend URL. Set backend `FRONTEND_ORIGIN` to the exact frontend origin (multiple comma-separated origins are supported). `frontend/public/_redirects` enables SPA route fallback on Netlify; configure the equivalent rewrite to `/index.html` on other hosts.

Never put `MONGO_URI` or `JWT_SECRET` in a `VITE_*` variable: frontend environment values are public in the built JavaScript.

## Install on a phone

- iPhone/iPad: open the HTTPS site in Safari, tap **Condividi**, then **Aggiungi alla schermata Home**. Launching from that icon opens the app standalone, without Safari's address/search bar. iOS does not show Chrome's automatic install prompt.
- Android: in Chrome use the **Installa** button when offered, or menu **⋮ → Installa app / Aggiungi a schermata Home**.

The web manifest and service worker are generated for production builds. During development the app intentionally runs without a service worker to avoid stale assets and API responses.