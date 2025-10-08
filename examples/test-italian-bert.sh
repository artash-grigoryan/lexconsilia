#!/bin/bash

echo "🇮🇹 Test du système RAG avec Italian-Legal-BERT"
echo "================================================"
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
BERT_URL="http://localhost:8080"

# Fonction pour afficher les résultats
check_service() {
    if curl -s "$1" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $2 is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $2 is NOT running${NC}"
        return 1
    fi
}

# 1. Vérification des services
echo -e "${BLUE}📡 Step 1: Vérification des services${NC}"
echo "-----------------------------------"

check_service "$BERT_URL/health" "Italian-Legal-BERT (port 8080)"
BERT_OK=$?

check_service "http://localhost:8000/api/v1/heartbeat" "ChromaDB (port 8000)"
CHROMADB_OK=$?

check_service "http://localhost:11434/api/tags" "Ollama (port 11434)"
OLLAMA_OK=$?

check_service "$API_URL/rag/stats" "NestJS API (port 3000)"
API_OK=$?

echo ""

if [ $BERT_OK -ne 0 ]; then
    echo -e "${RED}⚠️  Italian-BERT n'est pas disponible. Démarrez-le avec: docker-compose up -d${NC}"
    exit 1
fi

if [ $API_OK -ne 0 ]; then
    echo -e "${RED}⚠️  L'API NestJS n'est pas disponible. Démarrez-la avec: npm run start:dev${NC}"
    exit 1
fi

# 2. Test direct de Italian-BERT
echo -e "${BLUE}🧪 Step 2: Test direct de Italian-Legal-BERT${NC}"
echo "---------------------------------------------"

BERT_TEST=$(curl -s -X POST "$BERT_URL/embed" \
    -H "Content-Type: application/json" \
    -d '{"inputs": "responsabilità civile extracontrattuale"}')

if echo "$BERT_TEST" | grep -q "\["; then
    echo -e "${GREEN}✅ Italian-BERT génère correctement les embeddings${NC}"
    # Compter le nombre de dimensions
    DIMENSIONS=$(echo "$BERT_TEST" | jq '.[0] | length' 2>/dev/null)
    if [ ! -z "$DIMENSIONS" ]; then
        echo -e "${GREEN}   Dimensions: $DIMENSIONS${NC}"
    fi
else
    echo -e "${RED}❌ Erreur lors de la génération d'embeddings${NC}"
    echo "$BERT_TEST"
fi

echo ""

# 3. Indexation de documents juridiques italiens
echo -e "${BLUE}📝 Step 3: Indexation de documents juridiques italiens${NC}"
echo "------------------------------------------------------"

# Document 1: Codice Civile - Responsabilità extracontrattuale
echo "Indexing: Codice Civile Art. 2043..."
RESULT1=$(curl -s -X POST "$API_URL/rag/index/text" \
    -H "Content-Type: application/json" \
    -d '{
        "content": "Articolo 2043 del Codice Civile: Qualunque fatto doloso o colposo, che cagiona ad altri un danno ingiusto, obbliga colui che ha commesso il fatto a risarcire il danno.",
        "type": "LAW",
        "metadata": {
            "title": "Codice Civile - Articolo 2043",
            "source": "Codice Civile Italiano",
            "tags": ["responsabilità civile", "risarcimento danno"]
        }
    }')

if echo "$RESULT1" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Document 1 indexé${NC}"
else
    echo -e "${RED}❌ Erreur indexation document 1${NC}"
    echo "$RESULT1" | jq '.' 2>/dev/null || echo "$RESULT1"
fi

# Document 2: Contratto di lavoro
echo "Indexing: Contratto di lavoro..."
RESULT2=$(curl -s -X POST "$API_URL/rag/index/text" \
    -H "Content-Type: application/json" \
    -d '{
        "content": "Il contratto di lavoro subordinato è il contratto mediante il quale il lavoratore si obbliga, mediante retribuzione, a prestare il proprio lavoro intellettuale o manuale alle dipendenze e sotto la direzione del datore di lavoro.",
        "type": "LAW",
        "metadata": {
            "title": "Contratto di lavoro subordinato",
            "source": "Diritto del Lavoro",
            "tags": ["lavoro subordinato", "contratto"]
        }
    }')

if echo "$RESULT2" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Document 2 indexé${NC}"
else
    echo -e "${RED}❌ Erreur indexation document 2${NC}"
fi

# Document 3: Giurisprudenza
echo "Indexing: Sentenza responsabilità medica..."
RESULT3=$(curl -s -X POST "$API_URL/rag/index/text" \
    -H "Content-Type: application/json" \
    -d '{
        "content": "In tema di responsabilità medica, la Cassazione ha stabilito che il medico risponde per colpa professionale quando si discosta dalle linee guida senza giustificato motivo. Il paziente deve dimostrare il nesso causale tra la condotta e il danno.",
        "type": "JURISPRUDENCE",
        "metadata": {
            "title": "Cassazione - Responsabilità medica",
            "source": "Corte di Cassazione",
            "tags": ["responsabilità medica", "colpa professionale", "giurisprudenza"]
        }
    }')

if echo "$RESULT3" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Document 3 indexé${NC}"
else
    echo -e "${RED}❌ Erreur indexation document 3${NC}"
fi

echo ""
sleep 2

# 4. Requêtes de test
echo -e "${BLUE}🔍 Step 4: Requêtes de test${NC}"
echo "---------------------------"

# Query 1: Responsabilità civile
echo ""
echo -e "${YELLOW}Query 1: Come funziona la responsabilità civile in Italia?${NC}"
QUERY1=$(curl -s -X POST "$API_URL/rag/query" \
    -H "Content-Type: application/json" \
    -d '{
        "query": "Come funziona la responsabilità civile in Italia?",
        "type": "QUESTION",
        "maxResults": 3
    }')

if echo "$QUERY1" | grep -q '"answer"'; then
    echo -e "${GREEN}✅ Réponse obtenue${NC}"
    echo "$QUERY1" | jq '{answer: .answer, sources: (.sources | length)}' 2>/dev/null || echo "$QUERY1"
else
    echo -e "${RED}❌ Erreur lors de la requête${NC}"
    echo "$QUERY1"
fi

# Query 2: Contratto di lavoro
echo ""
echo -e "${YELLOW}Query 2: Quali sono le caratteristiche del contratto di lavoro subordinato?${NC}"
QUERY2=$(curl -s -X POST "$API_URL/rag/query" \
    -H "Content-Type: application/json" \
    -d '{
        "query": "Quali sono le caratteristiche del contratto di lavoro subordinato?",
        "type": "QUESTION",
        "maxResults": 3
    }')

if echo "$QUERY2" | grep -q '"answer"'; then
    echo -e "${GREEN}✅ Réponse obtenue${NC}"
    echo "$QUERY2" | jq '{answer: .answer, sources: (.sources | length)}' 2>/dev/null || echo "$QUERY2"
else
    echo -e "${RED}❌ Erreur lors de la requête${NC}"
fi

# Query 3: Responsabilità medica
echo ""
echo -e "${YELLOW}Query 3: Quando un medico è responsabile per colpa professionale?${NC}"
QUERY3=$(curl -s -X POST "$API_URL/rag/query" \
    -H "Content-Type: application/json" \
    -d '{
        "query": "Quando un medico è responsabile per colpa professionale?",
        "type": "QUESTION",
        "maxResults": 3
    }')

if echo "$QUERY3" | grep -q '"answer"'; then
    echo -e "${GREEN}✅ Réponse obtenue${NC}"
    echo "$QUERY3" | jq '{answer: .answer, sources: (.sources | length)}' 2>/dev/null || echo "$QUERY3"
else
    echo -e "${RED}❌ Erreur lors de la requête${NC}"
fi

echo ""

# 5. Statistiques
echo -e "${BLUE}📊 Step 5: Statistiques${NC}"
echo "----------------------"

STATS=$(curl -s "$API_URL/rag/stats")
echo "$STATS" | jq '.' 2>/dev/null || echo "$STATS"

echo ""
echo -e "${GREEN}✅ Tests terminés!${NC}"
echo ""
echo -e "${BLUE}💡 Prochaines étapes:${NC}"
echo "   - Consultez la documentation Swagger: http://localhost:3000/api"
echo "   - Indexez vos propres documents PDF via l'API"
echo "   - Testez avec des questions complexes en italien"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Guide complet: TEST_ITALIAN_BERT.md"
echo "   - Analyse modèle: MODELE_ITALIEN_ANALYSE.md"
echo ""
