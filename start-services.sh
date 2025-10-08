#!/bin/bash

echo "🐳 Démarrage de tous les services Docker..."
echo ""

cd docker
docker-compose up -d

echo ""
echo "⏳ Attente du démarrage des services (10 secondes)..."
sleep 10

echo ""
echo "📊 Statut des services:"
docker-compose ps

echo ""
echo "🔍 Vérification des services..."
echo ""

# ChromaDB
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB actif (port 8000)"
else
    echo "⚠️  ChromaDB pas encore prêt (port 8000)"
fi

# Italian-BERT
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Italian-Legal-BERT actif (port 8080) 🇮🇹"
else
    echo "⏳ Italian-Legal-BERT en cours de démarrage (port 8080)"
    echo "   Note: Le premier démarrage peut prendre 5-10 minutes"
    echo "   Commande pour suivre: docker logs -f lexconsilia-italian-bert"
fi

# Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama actif (port 11434)"
else
    echo "⚠️  Ollama pas encore prêt (port 11434)"
fi

# MongoDB
if docker exec lexconsilia-mongodb-local mongosh --eval "db.version()" --quiet > /dev/null 2>&1; then
    echo "✅ MongoDB actif (port 27017)"
else
    echo "⚠️  MongoDB pas encore prêt (port 27017)"
fi

echo ""
echo "💡 Pour suivre les logs d'Italian-BERT:"
echo "   docker logs -f lexconsilia-italian-bert"
