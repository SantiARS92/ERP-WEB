#!/bin/sh
set -eu

: "${API_HOST:?API_HOST is required}"
: "${API_PORT:?API_PORT is required}"

envsubst '${API_HOST} ${API_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
