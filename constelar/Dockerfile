# Constelar — campo 3D + API + tempo real, servidos por um único serviço Node.
# Build do frontend e execução do servidor (que serve o dist + /api + /ws).

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY --from=build /app/dist ./dist
# a porta vem da variável PORT do host (Render/Fly/Railway); 8787 é o padrão local
EXPOSE 8787
CMD ["node", "--experimental-sqlite", "server/index.mjs"]
