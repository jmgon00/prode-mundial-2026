#!/bin/bash
# Simple migration fix: mark the failed migration as rolled back, then deploy

echo "🔧 Resolviendo migración fallida..."

# Try to mark as rolled back (this works if DB is accessible)
npx prisma migrate resolve --rolled-back 20260611235606_add_funbet_categories 2>/dev/null || true

# Apply all pending migrations
echo "📋 Aplicando migraciones pendientes..."
npx prisma migrate deploy

echo "✅ Migraciones completadas"
