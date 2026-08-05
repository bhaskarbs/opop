#!/bin/sh
# Resolves host.docker.internal's IPv4 address specifically (grepping /etc/hosts for the entry
# without a ":" — IPv6 addresses always contain one, IPv4 addresses never do) and substitutes it
# into nginx.conf.template before nginx starts — see that file's header comment for why this
# exists instead of just using the hostname directly in the config.
set -eu

BACKEND_HOST_IPV4=$(grep 'host.docker.internal' /etc/hosts | grep -v ':' | awk '{print $1}' | head -1)
if [ -z "$BACKEND_HOST_IPV4" ]; then
  echo "Could not resolve an IPv4 address for host.docker.internal" >&2
  exit 1
fi

sed "s/__BACKEND_HOST__/$BACKEND_HOST_IPV4/g" /etc/nginx/nginx.conf.template >/etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
