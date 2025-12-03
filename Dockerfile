FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --production=false

COPY . .
RUN npm run build --if-present

FROM nginx:stable-alpine AS runner
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY public /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
