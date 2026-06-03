FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY api/ ./api/
COPY tsconfig.json ./

ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "api/server.ts"]
