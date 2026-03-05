#!/bin/sh

# Dynamically write all VITE_ prefixed env vars to window.__env
ENV_VARS=$(env | grep '^VITE_' | while IFS='=' read -r key value; do
  echo "  $key: \"$value\","
done)

cat > /opt/app/build/client/window.env.js <<EOF
window.__env = {
$ENV_VARS
};
EOF

exec "$@"