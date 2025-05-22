# ── 1) 빌드 스테이지
FROM node:20-bullseye-slim AS builder
WORKDIR /app

COPY package*.json yarn.lock ./
COPY prisma ./prisma/
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build
RUN npx prisma generate

# ── 2) 런타임 스테이지
FROM node:20-bullseye-slim
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]