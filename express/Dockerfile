# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy only build output.
COPY --from=builder /app/dist ./dist

# Never run as root inside a container.
USER node

# Listen on the port Coolify injects, not a hardcoded one.
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
