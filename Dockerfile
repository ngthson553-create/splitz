# ── Stage 1: build ──
# Node 22 trùng khớp "engines": ">=22" trong package.json và CI.
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifest trước để tận dụng layer cache: đổi source không cài lại deps.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# Marker __SITE_URL__ nằm trong các thẻ OG/Twitter; docker-entrypoint.sh thay
# bằng SPLITZ_SITE_URL thật lúc container khởi động → image không đóng băng URL
# của máy build.
ARG VITE_SITE_URL=__SITE_URL__
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ── Stage 2: chạy ──
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
