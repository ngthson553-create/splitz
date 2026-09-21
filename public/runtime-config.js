/*
 * Cấu hình runtime cho bản Docker self-host.
 *
 * File này nạp bằng thẻ <script> thường trong <head> — module bundle của Vite
 * bị hoãn (deferred) nên luôn chạy SAU: window.__SPLITZ_CONFIG__ chắc chắn có
 * mặt trước khi bất kỳ module nào đọc (src/lib/env.ts).
 *
 * Docker entrypoint ghi đè file này lúc container khởi động từ các biến môi
 * trường (SPLITZ_SUPABASE_URL, ...). Bản dev/build thường giữ object rỗng —
 * mọi giá trị vẫn đến từ import.meta.env như trước.
 */
window.__SPLITZ_CONFIG__ = window.__SPLITZ_CONFIG__ || {}
