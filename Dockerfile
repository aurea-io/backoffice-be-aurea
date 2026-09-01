FROM node:22-bookworm-slim

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts \
  && npx prisma generate \
  && npm cache clean --force

COPY nest-cli.json tsconfig*.json .prettierrc oxlint.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev \
  && npm cache clean --force

ENV NODE_ENV=production

EXPOSE 3001
CMD ["node", "dist/main.js"]
