#!/bin/sh
set -eu
if [ -n "${RAILWAY_ENVIRONMENT_ID:-}" ] && [ "${RAILWAY_VOLUME_MOUNT_PATH:-}" != "/data" ]; then
  echo "Attach a Railway persistent volume at /data before starting the portal." >&2
  exit 1
fi
mkdir -p /data/uploads
chown -R node:node /data
exec gosu node node server.js
