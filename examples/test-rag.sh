#!/bin/bash

# Script de test pour l'API RAG de LexConsilia
# Assurez-vous que l'application est démarrée avant d'exécuter ce script

API_URL="http://localhost:3000"

echo "🧪 Test de l'API RAG LexConsilia"
echo "================================"
echo ""

# Test 1: Statistiques initiales
echo "📊 Test 1: Récupération des statistiques"
curl -X GET "$API_URL/rag/stats" | jq
echo -e "\n"

# Test 2: Indexation d'un document texte (Loi)
echo "📝 Test 2: Indexation d'une loi"
curl -X POST "$API_URL/rag/index/text" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Article 1134 du Code Civil: Les conventions légalement formées tiennent lieu de loi à ceux qui les ont faites. Elles ne peuvent être révoquées que de leur consentement mutuel, ou pour les causes que la loi autorise. Elles doivent être exécutées de bonne foi.",
    "type": "LAW",
    "metadata": {
      "title": "Code Civil - Article 1134",
      "source": "Code Civil Français",
      "tags": ["contrats", "obligations", "bonne foi"]
    }
  }' | jq
echo -e "\n"

# Test 3: Indexation d'une jurisprudence
echo "⚖️ Test 3: Indexation d'une jurisprudence"
curl -X POST "$API_URL/rag/index/text" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Arrêt Cour de Cassation, Chambre Civile 1, 10 juillet 2013. En matière de responsabilité contractuelle, le créancier doit prouver lexistence du contrat et lexécution de sa propre obligation. Il incombe au débiteur de prouver la force majeure pour sexonérer de sa responsabilité.",
    "type": "JURISPRUDENCE",
    "metadata": {
      "title": "Cass. Civ. 1re, 10 juillet 2013",
      "date": "2013-07-10",
      "source": "Cour de Cassation",
      "tags": ["responsabilité contractuelle", "preuve", "force majeure"]
    }
  }' | jq
echo -e "\n"

# Test 4: Indexation d'un article juridique
echo "📄 Test 4: Indexation d'un article juridique"
curl -X POST "$API_URL/rag/index/text" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Le principe de la bonne foi en droit des contrats. La bonne foi est un principe fondamental qui gouverne lexécution des contrats. Elle impose aux parties un comportement loyal et honnête dans leurs relations contractuelles. Ce principe, codifié à larticle 1134 alinéa 3 du Code civil, a été renforcé par la réforme de 2016.",
    "type": "ARTICLE",
    "metadata": {
      "title": "La bonne foi contractuelle",
      "author": "Doctrine juridique",
      "tags": ["bonne foi", "droit des contrats", "loyauté"]
    }
  }' | jq
echo -e "\n"

# Test 5: Statistiques après indexation
echo "📊 Test 5: Statistiques après indexation"
curl -X GET "$API_URL/rag/stats" | jq
echo -e "\n"

# Test 6: Question simple
echo "❓ Test 6: Question sur les contrats"
curl -X POST "$API_URL/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quelles sont les règles concernant lexécution des contrats?",
    "type": "QUESTION",
    "maxResults": 3
  }' | jq
echo -e "\n"

# Test 7: Demande de résumé
echo "📋 Test 7: Demande de résumé"
curl -X POST "$API_URL/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Résume les principes de la bonne foi en droit des contrats",
    "type": "SUMMARY",
    "maxResults": 5
  }' | jq
echo -e "\n"

# Test 8: Demande d'analyse
echo "🔍 Test 8: Analyse juridique"
curl -X POST "$API_URL/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Analyse les conditions de la responsabilité contractuelle",
    "type": "ANALYSIS",
    "maxResults": 5
  }' | jq
echo -e "\n"

# Test 9: Test de déduplication (réindexer le même document)
echo "🔄 Test 9: Test de déduplication"
curl -X POST "$API_URL/rag/index/text" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Article 1134 du Code Civil: Les conventions légalement formées tiennent lieu de loi à ceux qui les ont faites. Elles ne peuvent être révoquées que de leur consentement mutuel, ou pour les causes que la loi autorise. Elles doivent être exécutées de bonne foi.",
    "type": "LAW",
    "metadata": {
      "title": "Code Civil - Article 1134 (duplicate)",
      "source": "Code Civil Français"
    }
  }' | jq
echo -e "\n"

echo "✅ Tests terminés!"

