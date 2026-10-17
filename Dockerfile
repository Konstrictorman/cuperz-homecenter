# syntax=docker/dockerfile:1

# One image for every environment: the browser calls the backend on the same
# origin (`/api/v1`, routed by the reverse proxy — see compose.yaml), so no
# backend URL is baked into the build. Runtime config (BETTER_AUTH_*) comes
# from the container environment. See README.md, "Docker".

ARG NODE_VERSION=24

# --- build -------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Not secret, same in every environment — baked into the bundle like any
# VITE_* variable. Optional: the app falls back to its own default title.
ARG VITE_APP_TITLE
RUN npm run build

# --- runtime -----------------------------------------------------------------
# Nitro's `node-server` output is self-contained (dependencies are bundled
# into .output/server), so the runtime image needs no node_modules.
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/auth/ok').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", ".output/server/index.mjs"]
