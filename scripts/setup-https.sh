#!/usr/bin/env bash
# ============================================================
# setup-https.sh — تثبيت Nginx + Certbot على EC2 (مرة واحدة)
# ============================================================
# الاستخدام:
#   chmod +x setup-https.sh
#   sudo ./setup-https.sh your-email@example.com
#
# المتطلبات قبل التشغيل:
#   1. أضف A record في Hostinger:  api  →  13.219.217.9
#   2. انتظر 5-10 دقائق حتى ينتشر الـ DNS
#   3. تأكد إن port 80 و 443 مفتوحين في EC2 Security Group
# ============================================================

set -euo pipefail

DOMAIN="api.helpers-tech.com"
EMAIL="${1:-}"
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
CERTBOT_WEBROOT="/var/www/certbot"

# ── التحقق من الـ email ───────────────────────────────────────
if [[ -z "$EMAIL" ]]; then
  echo "❌ الاستخدام: sudo ./setup-https.sh your-email@example.com"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Raaya HTTPS Setup"
echo "   Domain : $DOMAIN"
echo "   Email  : $EMAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. تحديث الحزم ────────────────────────────────────────────
echo "📦 تحديث الحزم..."
yum update -y -q 2>/dev/null || apt-get update -qq

# ── 2. تثبيت Nginx ────────────────────────────────────────────
echo "📦 تثبيت Nginx..."
if command -v yum &>/dev/null; then
  # Amazon Linux 2 / RHEL
  yum install -y nginx
  systemctl enable nginx
else
  # Ubuntu / Debian
  apt-get install -y -qq nginx
fi

# ── 3. تثبيت Certbot ─────────────────────────────────────────
echo "📦 تثبيت Certbot..."
if command -v yum &>/dev/null; then
  yum install -y python3-certbot-nginx 2>/dev/null || {
    pip3 install certbot certbot-nginx
  }
else
  apt-get install -y -qq certbot python3-certbot-nginx
fi

# ── 4. إنشاء مجلد webroot ─────────────────────────────────────
mkdir -p "$CERTBOT_WEBROOT"

# ── 5. نسخ Nginx config ───────────────────────────────────────
echo "📄 نسخ Nginx config..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

if [[ -f "$REPO_ROOT/nginx/raaya-api.conf" ]]; then
  cp "$REPO_ROOT/nginx/raaya-api.conf" "$NGINX_CONF_DIR/raaya-api"
else
  # fallback: نكتب config مؤقت HTTP فقط حتى نحصل على الشهادة
  cat > "$NGINX_CONF_DIR/raaya-api" <<'EOF'
server {
    listen 80;
    server_name api.helpers-tech.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { proxy_pass http://127.0.0.1:3000; }
}
EOF
fi

# ── 6. تفعيل الـ site وإزالة الـ default ──────────────────────
if [[ -d "$NGINX_ENABLED_DIR" ]]; then
  rm -f "$NGINX_ENABLED_DIR/default"
  ln -sf "$NGINX_CONF_DIR/raaya-api" "$NGINX_ENABLED_DIR/raaya-api"
fi

# ── 7. اختبار config وتشغيل Nginx ────────────────────────────
echo "🔍 اختبار Nginx config..."
nginx -t
systemctl start nginx 2>/dev/null || service nginx start

# ── 8. الحصول على شهادة TLS ──────────────────────────────────
echo "🔐 الحصول على شهادة Let's Encrypt لـ $DOMAIN..."
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  --redirect

# ── 9. نسخ الـ config الكامل (مع HTTPS) بعد الشهادة ──────────
if [[ -f "$REPO_ROOT/nginx/raaya-api.conf" ]]; then
  cp "$REPO_ROOT/nginx/raaya-api.conf" "$NGINX_CONF_DIR/raaya-api"
  nginx -t && systemctl reload nginx
fi

# ── 10. إعداد Auto-Renew تلقائي ──────────────────────────────
echo "⏰ إعداد auto-renew..."
CRON_JOB="0 3 * * * certbot renew --quiet --nginx && systemctl reload nginx"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -

# ── 11. فتح Firewall (إن وُجد) ────────────────────────────────
if command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ تم الإعداد بنجاح!"
echo ""
echo "   🌐 API URL: https://$DOMAIN"
echo "   📋 Swagger: https://$DOMAIN/api/docs"
echo ""
echo "   جرّب: curl https://$DOMAIN/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
