#!/bin/bash

# Script de test pour l'indexation et l'analyse de PDFs
# Créez d'abord un fichier PDF de test ou utilisez vos propres PDFs

API_URL="http://localhost:3000"

echo "📄 Test d'indexation et analyse de PDFs"
echo "========================================"
echo ""

# Vérifiez si un fichier PDF est fourni en argument
if [ $# -eq 0 ]; then
    echo "❌ Erreur: Aucun fichier PDF fourni"
    echo "Usage: ./test-pdf.sh <chemin-vers-pdf>"
    echo ""
    echo "Exemple: ./test-pdf.sh ./mon-document.pdf"
    exit 1
fi

PDF_FILE="$1"

if [ ! -f "$PDF_FILE" ]; then
    echo "❌ Erreur: Le fichier $PDF_FILE n'existe pas"
    exit 1
fi

echo "📄 Fichier PDF: $PDF_FILE"
echo ""

# Test 1: Indexation d'un PDF
echo "📝 Test 1: Indexation du PDF"
curl -X POST "$API_URL/rag/index/pdf" \
  -F "file=@$PDF_FILE" \
  -F 'metadata={"title":"Document de test","type":"JURISPRUDENCE","tags":["test"]}' | jq
echo -e "\n"

# Test 2: Analyse d'un PDF sans indexation
echo "🔍 Test 2: Analyse du PDF (résumé)"
curl -X POST "$API_URL/rag/analyze/pdf" \
  -F "file=@$PDF_FILE" \
  -F "query=Fournis un résumé détaillé de ce document" | jq
echo -e "\n"

# Test 3: Analyse avec une question spécifique
echo "❓ Test 3: Question spécifique sur le PDF"
curl -X POST "$API_URL/rag/analyze/pdf" \
  -F "file=@$PDF_FILE" \
  -F "query=Quels sont les points juridiques principaux de ce document?" | jq
echo -e "\n"

echo "✅ Tests PDF terminés!"

