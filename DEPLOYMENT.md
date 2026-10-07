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

For a Vercel frontend and a separately hosted backend:

1. In Vercel project settings, set `VITE_API_BASE_URL` to the backend's HTTPS origin only, for example `https://atelier-api.onrender.com`. Do not add `/api`, a Vercel project path, or a trailing route. Redeploy the frontend after changing it.
2. In the backend environment, set `FRONTEND_ORIGIN` to the exact public Vercel origins, including scheme and comma-separated aliases, for example `https://booking-system-p3pp304.vercel.app,https://booking-system-two-chi.vercel.app`. Restart the backend after changing it.
3. In Vercel Deployment Protection, make the production deployment public. A manifest request redirected to `vercel.com/sso-api` means Vercel Authentication is intercepting the PWA file; the app manifest and service worker must be publicly reachable over HTTPS.

If the browser reports a request like `/dhkbdw/api/config`, `VITE_API_BASE_URL` is set to a path instead of the backend origin. The frontend now rejects this configuration and reports the expected format. `frontend/public/_redirects` enables SPA route fallback on Netlify; configure the equivalent rewrite to `/index.html` on other static hosts.

Never put `MONGO_URI` or `JWT_SECRET` in a `VITE_*` variable: frontend environment values are public in the built JavaScript.

If a database URI or JWT secret has been exposed, rotate the database user's password and replace `JWT_SECRET` in the backend environment, then redeploy/restart the backend. Do not paste secrets into source files or chat.

## Install on a phone

- iPhone/iPad: open the HTTPS site in Safari, tap **Condividi**, then **Aggiungi alla schermata Home**. Launching from that icon opens the app standalone, without Safari's address/search bar. iOS does not show Chrome's automatic install prompt.
- Android: in Chrome use the **Installa** button when offered, or menu **⋮ → Installa app / Aggiungi a schermata Home**.

The web manifest and service worker are generated for production builds. During development the app intentionally runs without a service worker to avoid stale assets and API responses.