FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm ci
RUN npm run build --workspace @cpay/contracts && npm run build --workspace @cpay/api

WORKDIR /app/apps/api
EXPOSE 4000

CMD ["node", "dist/index.js"]
