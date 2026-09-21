#!/bin/sh
# Sinh lại cấu hình runtime lúc container khởi động từ biến môi trường CONTAINER.
#
# Image build một lần, chạy ở đâu cũng cấu hình được — nhờ 2 cơ chế:
#   1. /runtime-config.js — window.__SPLITZ_CONFIG__, nạp bằng <script> blocking
#      trước module bundle (xem public/runtime-config.js và src/lib/env.ts).
#   2. marker __SITE_URL__ trong index.html — lúc build Docker ta cố tình đặt
#      VITE_SITE_URL=__SITE_URL__ để thẻ OG/Twitter chứa marker duy nhất, dễ
#      thay tại đây, thay vì sed trúng URL localhost dễ vỡ khi đổi default.
#
# Quy ước tên: biến container SPLITZ_* (không có tiền tố VITE_ — đây là cấu hình
# của container, không phải của bản build Vite).
set -eu

WEB_ROOT="${WEB_ROOT:-/usr/share/nginx/html}"
SITE_URL="${SPLITZ_SITE_URL:-}"

# ── 1) runtime-config.js ──
conf="$WEB_ROOT/runtime-config.js"
{
  echo '/* Sinh bởi docker-entrypoint.sh từ biến môi trường container. */'
  printf 'window.__SPLITZ_CONFIG__ = {\n'
  emit() {
    # emit <VITE_TEN> <SPLITZ_TEN>: chỉ ghi key có giá trị khác rỗng.
    val=$(eval "printf '%s' \"\${$2:-}\"")
    if [ -n "$val" ]; then
      # JSON-quote bằng cách thoát \ và "
      val=$(printf '%s' "$val" | sed 's/\\/\\\\/g; s/"/\\"/g')
      printf '  %s: "%s",\n' "$1" "$val"
    fi
  }
  emit VITE_SUPABASE_URL       SPLITZ_SUPABASE_URL
  emit VITE_SUPABASE_ANON_KEY  SPLITZ_SUPABASE_ANON_KEY
  emit VITE_ZALO_APP_ID        SPLITZ_ZALO_APP_ID
  emit VITE_VAPID_PUBLIC_KEY   SPLITZ_VAPID_PUBLIC_KEY
  emit VITE_POSTHOG_HOST       SPLITZ_POSTHOG_HOST
  emit VITE_POSTHOG_KEY        SPLITZ_POSTHOG_KEY
  emit VITE_SENTRY_DSN         SPLITZ_SENTRY_DSN
  emit VITE_ENABLE_PASSWORD_LOGIN SPLITZ_ENABLE_PASSWORD_LOGIN
  printf '};\n'
} > "$conf"
chmod 644 "$conf"

# ── 2) Thay marker __SITE_URL__ trong index.html ──
if [ -n "$SITE_URL" ]; then
  # Xoá dấu / cuối để không tạo //og-image.png
  SITE_URL=$(printf '%s' "$SITE_URL" | sed 's:/*$::')
  sed -i "s|__SITE_URL__|$SITE_URL|g" "$WEB_ROOT/index.html"
else
  # Không đặt SITE_URL: bỏ marker để không lộ chuỗi lạ trong meta tag.
  sed -i 's|__SITE_URL__||g' "$WEB_ROOT/index.html"
fi

exec "$@"
