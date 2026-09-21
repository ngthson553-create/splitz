# Tự host Splitz

> Hướng dẫn chạy Splitz trên hạ tầng của bạn — từ image Docker có sẵn đến
> nguyên bộ Supabase stack. Áp dụng cho bản release hiện tại của nhánh `main`.

Splitz gồm 2 phần:

| Phần | Vai trò | Bắt buộc? |
| --- | --- | --- |
| **Frontend SPA** (repo này) | Toàn bộ UI, PWA, engine chia tiền chạy trên client | Có |
| **Backend Supabase** | Đăng nhập, đồng bộ đa thiết bị, lưu trữ đính kèm, Edge Functions (AI/OCR/nhắc nợ) | Không — không có nó, app chạy **chế độ local** (dữ liệu trong localStorage) |

Bắt đầu nhanh nhất:

```bash
docker run -d -p 8080:80 ghcr.io/ngthson553-create/splitz:latest
# mở http://localhost:8080 — chế độ local, không cần backend
```

## Mục lục

1. [Docker — chỉ frontend (chế độ local)](#1-docker--chỉ-frontend-chế-độ-local)
2. [Docker — đầy đủ backend Supabase (khuyến nghị cho VPS)](#2-docker--đầy-đủ-backend-supabase-khuyến-nghị-cho-vps)
3. [Build thủ công bằng Node 22](#3-build-thủ-công-bằng-node-22)
4. [Cloudflare Pages](#4-cloudflare-pages)
5. [Host tĩnh khác (Netlify, Vercel, nginx…)](#5-host-tĩnh-khác)
6. [Danh sách biến môi trường](#6-danh-sách-biến-môi-trường)
7. [Từ local lên Supabase riêng](#7-từ-local-lên-supabase-riêng)

---

## 1. Docker — chỉ frontend (chế độ local)

```bash
docker run -d --name splitz -p 8080:80 ghcr.io/ngthson553-create/splitz:latest
```

Xong. App chạy ở `http://<máy>:8080` ở chế độ local: tạo nhóm, ghi chi, chia
tiền, tạo QR — tất cả trong localStorage của trình duyệt, không tài khoản.

Muốn có URL OG/social đúng khi đặt sau domain:

```bash
docker run -d --name splitz -p 8080:80 \
  -e SPLITZ_SITE_URL=https://splitz.example.com \
  ghcr.io/ngthson553-create/splitz:latest
```

Image **tái cấu hình lúc chạy** (không cần build lại): cấu hình được sinh lại
bởi entrypoint từ biến môi trường container ở mỗi lần start — xem
[danh sách biến](#6-danh-sách-biến-môi-trường). Cơ chế: `public/runtime-config.js`
nạp bằng thẻ `<script>` blocking trước module bundle, nên `window.__SPLITZ_CONFIG__`
luôn có mặt trước khi code app chạy.

Hoặc dùng compose (đầy đủ biến, dễ nâng cấp):

```bash
git clone https://github.com/ngthson553-create/splitz.git
cd splitz
docker compose up -d --build   # → http://localhost:8080
```

## 2. Docker — đầy đủ backend Supabase (khuyến nghị cho VPS)

Một lệnh dựng cả stack: **Splitz app + Postgres 17 + GoTrue (auth) + PostgREST
(API) + Storage (đính kèm) + Edge Functions (18 function của Splitz) + Kong
(gateway) + Studio (tuỳ chọn)**. 34 migration của Splitz chạy tự động đúng
thứ tự sau khi hạ tầng sẵn sàng.

### Bước 1 — sinh khoá

```bash
git clone https://github.com/ngthson553-create/splitz.git && cd splitz
cp .env.docker.example .env.docker
```

Mở `.env.docker.example`, copy khối lệnh `node -e '...'` ở đầu file, chạy nó —
in ra `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` — dán
vào `.env.docker`. Khoá là JWT HS256 3 phần ký bằng `JWT_SECRET`, đúng format
mà PostgREST/Storage/GoTrue đều chấp nhận.

> ⚠️ Không commit `.env.docker` (đã có trong .gitignore). Không bao giờ đưa
> `SERVICE_ROLE_KEY` ra client — chỉ `ANON_KEY` là khoá công khai.

### Bước 2 — chỉnh URL

Trong `.env.docker`:

```ini
SITE_URL=http://localhost:8080          # URL app mà trình duyệt mở
API_EXTERNAL_URL=http://localhost:8081  # URL API mà trình duyệt gọi được
```

Có domain + TLS (reverse proxy như Caddy / nginx / Traefik) thì đặt cả hai thành
`https://...` — và nên đưa API về cùng 1 domain qua path `/api/…` nếu muốn
(khi đó đổi `SPLITZ_SUPABASE_URL` của service `splitz` tương ứng).

### Bước 3 — lên stack

```bash
docker compose -f docker-compose.supabase.yml --env-file .env.docker up -d --build
```

Chờ ~1–2 phút (lần đầu kéo image). Kiểm tra:

```bash
docker compose -f docker-compose.supabase.yml ps    # mọi service Up/healthy
docker logs splitz-migrations                       # "Hoàn tất toàn bộ migration"
curl http://localhost:8081/auth/v1/health           # {"name":"GoTrue",...}
```

Xong: mở `http://localhost:8080` → đăng nhập bằng **email + mật khẩu**
(bật sẵn cho self-host — không cần tạo project Google Cloud như OAuth).
Nút Google/Zalo vẫn hiển thị nhưng cần cấu hình provider riêng nếu muốn dùng.

**Studio (dashboard quản trị Supabase)** — tuỳ chọn, image lớn (~4 GB):

```bash
docker compose -f docker-compose.supabase.yml --env-file .env.docker --profile studio up -d
# → http://localhost:8082
```

### Cấu trúc stack

| Dịch vụ | Cổng host | Ghi chú |
| --- | --- | --- |
| `splitz` (app) | 8080 | nginx SPA + runtime config |
| `kong` (API) | 8081 | `/auth/v1` `/rest/v1` `/storage/v1` `/functions/v1` |
| `db` | — | Postgres 17 (image supabase), volume `db-data` |
| `auth` / `rest` / `storage` / `functions` | — | nội bộ, qua Kong |
| `studio` + `meta` | 8082 | chỉ khi `--profile studio` |

Realtime/Supavisor không có mặt vì Splitz đồng bộ bằng polling 20s — không
dùng kênh realtime nào.

### Vận hành

```bash
# backup toàn bộ dữ liệu
docker exec splitz-db pg_dump -U postgres postgres | gzip > splitz-$(date +%F).sql.gz

# nâng cấp lên bản mới
git pull
docker compose -f docker-compose.supabase.yml --env-file .env.docker up -d --build
# migration mới (nếu có) tự chạy — service migrations ghi tiến độ vào bảng _splitz_migrations

# email xác thực thật (thay autoconfirm): điền khối SMTP_* trong .env.docker
# và đặt ENABLE_EMAIL_AUTOCONFIRM=false, rồi up -d lại
```

### Các vấn đề đã biết (đã xử lý sẵn trong compose — ghi lại để hiểu cơ chế)

- Image `supabase/postgres` tạo các role service **không mật khẩu**;
  `docker/db/roles.sql` đặt mật khẩu = `POSTGRES_PASSWORD` ở lần init đầu.
- Schema `storage` do storage-api tạo lúc nó boot và **không kèm policy**;
  service `migrations` áp `docker/db/storage-policies.sql` (policy SELECT cho
  `storage.buckets`) sau khi schema sẵn sàng — thiếu là mọi bucket trả
  `NoSuchBucket`.
- Lịch sử 34 migration **không replay tuyến tính** (0002 là snapshot schema
  đầy đủ, 0019 tái tạo `ai_usage`): runner theo dõi file đã áp trong bảng
  `_splitz_migrations`, dung lỗi lớp "already exists" khi áp lại không
  transaction (để các câu lệnh RIÊNG của file vẫn vào, vd hàm `bump_ai_usage`),
  và chốt bằng kiểm tra trạng thái cuối.
- Đổi `POSTGRES_PASSWORD` sau lần đầu **không** tự cập nhật mật khẩu role —
  muốn đổi thì chạy lại ALTER theo mẫu trong `docker/db/roles.sql` rồi mới
  `up -d`.

## 3. Build thủ công bằng Node 22

```bash
git clone https://github.com/ngthson553-create/splitz.git && cd splitz
npm ci            # .npmrc đã có legacy-peer-deps=true
npm run build     # → dist/
```

Phục vụ `dist/` bằng bất kỳ web server tĩnh nào có SPA fallback. Ví dụ Node:

```bash
npx serve dist -s -l 8080
```

Đặt biến build-time (xem [bảng](#6-danh-sách-biến-môi-trường)) TRƯỚC khi
`npm run build` nếu muốn nhúng sẵn — hoặc để trống và cung cấp runtime qua
`window.__SPLITZ_CONFIG__` như image Docker đang làm (tham khảo
`docker-entrypoint.sh`).

## 4. Cloudflare Pages

Bản tham chiếu splitz.tson.io.vn chạy đúng cách này.

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 22 (đặt `NODE_VERSION=22` trong Environment variables)
- **SPA fallback:** có sẵn qua `public/_redirects` (`/* /index.html 200`) —
  không cần cấu hình thêm
- **Environment variables:** đặt `VITE_SITE_URL=https://<ten-mien>.pages.dev`
  (hoặc domain tuỳ chỉnh) trước lần build đầu; các biến `VITE_*` còn lại theo
  [bảng](#6-danh-sách-biến-môi-trường)

Cloudflare Pages mặc định cache asset có hash rất tốt; service worker tự quản
bản dịch của nó qua `registerType: autoUpdate`.

## 5. Host tĩnh khác

Yêu cầu duy nhất của SPA: **mọi route không khớp file tĩnh phải trả về
`index.html`** (status 200).

- **Netlify:** có sẵn `_redirects` trong `public/` — build `npm run build`,
  publish `dist`.
- **Vercel:** thêm `vercel.json` với rewrite `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
- **nginx tự quản:**

  ```nginx
  server {
    listen 80;
    root /srv/splitz/dist;
    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
    location = /sw.js { add_header Cache-Control "no-cache"; }
    location = /runtime-config.js { add_header Cache-Control "no-cache"; }
  }
  ```

  (File `nginx.conf` trong repo chính là cấu hình này ở dạng đầy đủ.)

## 6. Danh sách biến môi trường

### Dùng lúc BUILD (Vite nhúng vào bundle — `import.meta.env`)

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `VITE_SITE_URL` | Khi deploy | URL công khai của app (thẻ OG/Twitter tuyệt đối). Bỏ trống = `http://localhost:5173` |
| `VITE_SUPABASE_URL` | Cloud mode | URL Supabase (vd `https://abc.supabase.co`). Có 2 biến Supabase = bật cloud |
| `VITE_SUPABASE_ANON_KEY` | Cloud mode | Publishable/anon key — khoá CÔNG KHAI |
| `VITE_ZALO_APP_ID` | — | Bật nút đăng nhập Zalo |
| `VITE_ZALO_VERIFICATION` | — | Sinh thẻ meta xác thực tên miền Zalo |
| `VITE_VAPID_PUBLIC_KEY` | — | Bật web push (nhắc nợ/gia hạn) |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | — | Analytics |
| `VITE_SENTRY_DSN` | — | Crash reporting |
| `VITE_ENABLE_PASSWORD_LOGIN` | — | Hiện form email + mật khẩu ở màn đăng nhập (mặc định tắt) |

### Dùng lúc RUN (biến môi trường container Docker — entrypoint sinh runtime-config.js)

Tên giống hệt nhưng đổi tiền tố `VITE_` → `SPLITZ_`: `SPLITZ_SUPABASE_URL`,
`SPLITZ_SUPABASE_ANON_KEY`, `SPLITZ_ZALO_APP_ID`, `SPLITZ_VAPID_PUBLIC_KEY`,
`SPLITZ_POSTHOG_HOST`, `SPLITZ_POSTHOG_KEY`, `SPLITZ_SENTRY_DSN`,
`SPLITZ_ENABLE_PASSWORD_LOGIN`, cộng thêm `SPLITZ_SITE_URL` (thay marker OG
trong `index.html`).

**Ưu tiên:** giá trị runtime > giá trị build-time (xem `src/lib/env.ts`).
Bản Cloudflare Pages không đặt biến runtime — hành vi y như trước.

### Chỉ dành cho `docker-compose.supabase.yml` (trong `.env.docker`)

Xem chú thích trực tiếp trong [`.env.docker.example`](../.env.docker.example) —
gồm `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, SMTP,
cổng, và các cờ `ENABLE_EMAIL_*` / `DISABLE_SIGNUP`.

## 7. Từ local lên Supabase riêng

Người dùng đã chạy chế độ local (dữ liệu trong localStorage) muốn chuyển lên
backend riêng:

1. Dựng backend (mục 2) hoặc dùng Supabase cloud của bạn (tạo project mới,
   chạy 34 file trong `supabase/migrations/` theo thứ tự tên — lưu ý mục
   "các vấn đề đã biết" ở trên về tính trùng lặp lịch sử nếu chạy bằng tay;
   với Supabase cloud, `supabase db push` xử lý tracking giúp bạn).
2. Trỏ app tới backend: đặt `SPLITZ_SUPABASE_URL` + `SPLITZ_SUPABASE_ANON_KEY`
   (Docker) hoặc `VITE_*` tương ứng (build thường), rồi khởi động lại app.
3. App phát hiện cấu hình cloud → chuyển sang chế độ cloud, yêu cầu đăng nhập
   và onboarding lại hồ sơ. **Dữ liệu local không tự migrate sang cloud** —
   đây là giới hạn đã biết của v1; nhóm local vẫn đọc được bằng cách mở app ở
   chế độ local (không đặt biến Supabase).
4. Edge Functions cần khoá riêng (Gemini, Resend, PayOS, web-push…) — đặt qua
   `supabase secrets set` với bản cloud, hoặc env của container `functions`
   với bản self-host. Thiếu khoá nào thì tính năng đó tắt êm, không lỗi.

## Ngôn ngữ

App song ngữ Việt/Anh: tự nhận theo trình duyệt, đổi tay ở
**Cài đặt → Ngôn ngữ**. Muốn đóng góp bản dịch: mọi chuỗi UI nằm trong
`src/lib/i18n/locales/{vi,en}/` — bản tiếng Việt là nguồn gốc kiểu, thiếu key
ở bản tiếng Anh là **lỗi biên dịch**, không phải chuỗi trống lúc chạy.
