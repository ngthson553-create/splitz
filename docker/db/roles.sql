-- Sao y supabase/docker (volumes/db/roles.sql): image supabase/postgres tạo
-- các role service KHÔNG mật khẩu; file này chạy ở lần initdb đầu (mount vào
-- /docker-entrypoint-initdb.d/) và đặt mật khẩu các role = POSTGRES_PASSWORD
-- để GoTrue/PostgREST/Storage/Functions kết nối được.
--
-- Lưu ý: chỉ chạy lần init ĐẦU (volume db-data trống). Đổi POSTGRES_PASSWORD
-- sau đó sẽ KHÔNG tự cập nhật các role này.
\set pgpass `echo "$POSTGRES_PASSWORD"`

-- supabase_functions_admin KHÔNG tồn tại ở một số version image (17.6.1.136)
-- và khi thiếu, psql dừng còn lại các dòng sau → đặt nó CUỐI (edge-runtime
-- self-host nối bằng postgres, không cần role này).
ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
