#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Applying migrations..."
  until python manage.py migrate --noinput; do
    echo "Database unavailable, retrying in 2s..."
    sleep 2
  done
fi

exec "$@"
