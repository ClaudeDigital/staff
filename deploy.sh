#!/bin/bash
# Deploy script for staff-manager
set -e

echo "=== Installing dependencies ==="
cd /opt/staff
npm install --production

echo "=== Setting up data directory ==="
mkdir -p /opt/staff/data

echo "=== Configuring Nginx ==="
cp /opt/staff/nginx.conf /etc/nginx/sites-available/staff
ln -sf /etc/nginx/sites-available/staff /etc/nginx/sites-enabled/staff
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Starting with PM2 ==="
pm2 delete staff 2>/dev/null || true
pm2 start /opt/staff/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "=== Done! Staff Manager is running on port 80 ==="
pm2 status
