#!/bin/bash

echo "🧪 Test de l'intégration Swagger"
echo "================================"
echo ""

# Démarrer l'application en arrière-plan
echo "📦 Démarrage de l'application..."
npm run start:dev > /dev/null 2>&1 &
APP_PID=$!

# Attendre que l'app démarre
echo "⏳ Attente du démarrage (10 secondes)..."
sleep 10

# Tester l'endpoint Swagger
echo "🔍 Test de l'endpoint Swagger..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Swagger est accessible!"
    echo "📖 Documentation disponible sur: http://localhost:3000/api"
else
    echo "❌ Swagger n'est pas accessible (HTTP $RESPONSE)"
fi

# Tester l'endpoint JSON
echo ""
echo "🔍 Test de la spec OpenAPI..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api-json)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Spécification OpenAPI JSON accessible!"
    echo "📥 Disponible sur: http://localhost:3000/api-json"
else
    echo "⚠️ Spécification JSON non accessible (HTTP $RESPONSE)"
fi

# Arrêter l'application
echo ""
echo "🛑 Arrêt de l'application..."
kill $APP_PID 2>/dev/null

echo ""
echo "✅ Test terminé!"
