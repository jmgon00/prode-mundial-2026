#!/bin/bash
set -e

echo "🔄 Aplicando migraciones..."
npx prisma migrate deploy || true

echo "🚀 Iniciando aplicación..."
npx tsx src/app.ts
