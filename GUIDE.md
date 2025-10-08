# 🇮🇹 LexConsilia - Système RAG pour Documents Juridiques Italiens

## 📋 Vue d'Ensemble

Système RAG (Retrieval-Augmented Generation) spécialisé pour le droit italien avec:

- **Italian-Legal-BERT** (embeddings spécialisés 768 dimensions)
- **ChromaDB** (base vectorielle)
- **Ollama** (génération de réponses)
- **LangChain** (chunking intelligent)
- **NestJS** (API REST)

## 🚀 Démarrage Rapide

```bash
# 1. Démarrer les services Docker
docker-compose up -d

# 2. Vérifier que tout tourne
docker-compose ps

# 3. Lancer l'application
npm run start:dev

# 4. Ouvrir Swagger
open http://localhost:3000/api
```

## 📡 Services

| Service      | Port  | Description         |
| ------------ | ----- | ------------------- |
| NestJS API   | 3000  | API REST + Swagger  |
| ChromaDB     | 8000  | Base vectorielle    |
| Italian-BERT | 8080  | Embeddings 768 dims |
| Ollama       | 11434 | Génération réponses |
| MongoDB      | 27017 | Base de données     |

## 🔧 API Endpoints

### Indexation

```bash
# Indexer un texte
POST /rag/index/text
{
  "content": "Articolo 2043...",
  "type": "LAW",
  "metadata": {"title": "Codice Civile"}
}

# Indexer un PDF
POST /rag/index/pdf
multipart/form-data: file=@document.pdf

# Indexer plusieurs PDFs
POST /rag/index/pdfs
multipart/form-data: files=@doc1.pdf, files=@doc2.pdf
```

### Consultation

```bash
# Poser une question
POST /rag/query
{
  "query": "Come funziona la responsabilità civile?",
  "type": "QUESTION",
  "maxResults": 5
}

# Analyser un PDF sans indexation
POST /rag/analyze/pdf
multipart/form-data: file=@document.pdf, query=Résume ce document

# Statistiques
GET /rag/stats
```

## ⚙️ Configuration Système

### Embeddings

- **Type:** ChromaDB par défaut (384 dimensions)
- **Modèle:** sentence-transformers/all-MiniLM-L6-v2
- **Avantage:** Rapide, léger, pas de service externe

### Modèle Ollama

- **Modèle:** `mistral:7b-instruct-q4_0`
- **Taille:** ~4 GB (quantifié Q4)
- **Mémoire requise:** 7-8 GB Docker RAM
- **Contexte:** 32768 tokens

### Chunking

- **Méthode:** LangChain RecursiveCharacterTextSplitter
- **Taille:** 1000 caractères
- **Overlap:** 200 caractères
- **Séparateurs:** Paragraphes → Phrases → Mots

### Performance

- **Batching:** 10 documents par batch
- **Pause:** 200ms entre batches
- **Indexation:** ~1-2s par document
- **Query:** ~30-120s ⚠️ (CPU seulement, patience requise!)

## ⚠️ Important: Temps de Réponse

**Les requêtes prennent du temps sur CPU (normal!):**

- Première query: 30-90 secondes
- Queries suivantes: 30-60 secondes
- Sur GPU: 10-50x plus rapide

**Pourquoi c'est lent?**

- Ollama sur CPU (pas de GPU)
- Modèle quantifié Q4 (optimisé mais toujours 4GB)
- RAM Docker limitée (7.7 GB)
- Context window: 4096 tokens

**Soyez patient! 🕐 C'est normal d'attendre 1-2 minutes.**

## ⚠️ Dépannage Rapide

```bash
# Reset complet ChromaDB
docker-compose down chromadb
docker volume rm lexconsilia_chromadb_data
docker-compose up -d chromadb

# Reconstruire Italian-BERT
docker-compose build --no-cache huggingface-embeddings
docker-compose up -d --force-recreate huggingface-embeddings

# Vérifier les services
curl http://localhost:8000/api/v1/heartbeat  # ChromaDB
curl http://localhost:8080/health            # Italian-BERT
curl http://localhost:11434/api/tags         # Ollama
curl http://localhost:3000/rag/stats         # API

# Voir les logs
docker logs -f lexconsilia-italian-bert
docker logs -f lexconsilia-chromadb
```

## 🧪 Test Complet

```bash
# 1. Indexer un document
curl -X POST http://localhost:3000/rag/index/text \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Articolo 2043 del Codice Civile: Qualunque fatto doloso o colposo, che cagiona ad altri un danno ingiusto, obbliga colui che ha commesso il fatto a risarcire il danno.",
    "type": "LAW",
    "metadata": {
      "title": "Codice Civile - Articolo 2043",
      "source": "Codice Civile Italiano"
    }
  }'

# 2. Poser une question
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Come funziona la responsabilità civile in Italia?",
    "type": "QUESTION",
    "maxResults": 3
  }'
```

## 📊 Configuration

### Variables d'environnement (.env optionnel)

```env
PORT=3000
CHROMADB_URL=http://localhost:8000
HUGGINGFACE_EMBEDDINGS_URL=http://localhost:8080
OLLAMA_URL=http://localhost:11434
```

### Paramètres optimisés

- **Batch size:** 10 documents (CPU optimisé)
- **Chunk size:** 1000 caractères (LangChain)
- **Chunk overlap:** 200 caractères
- **Context window:** 32768 tokens (Ollama)
- **Embeddings:** 768 dimensions (Italian-BERT)

## ✅ Logs de Succès

Au démarrage:

```
[ItalianEmbeddingsService] 🇮🇹 Italian-Legal-BERT embeddings service is available
[ChromaDBService] ChromaDB collection "legal_documents_italian" initialized successfully
[DocumentProcessorService] DocumentProcessorService initialized with LangChain text splitter
```

Lors de l'indexation:

```
[DocumentProcessorService] 📄 LangChain splitting: 5000 chars → 6 chunks
[ChromaDBService] 🇮🇹 Generating embeddings for 6 documents...
[ChromaDBService] ✅ Generated 6 Italian legal embeddings
[ChromaDBService] Added 6 documents to ChromaDB
```

Pour gros PDF (batching):

```
[ChromaDBService] 🇮🇹 Generating embeddings for 53 documents in batches of 10...
[ChromaDBService] 📦 Batch 1/6: Processing 10 documents...
[ChromaDBService] 📦 Batch 2/6: Processing 10 documents...
...
[ChromaDBService] ✅ Generated 53 Italian legal embeddings in 6 batches
```

## 🎯 Architecture Technique

```
PDF/Texte
   ↓
LangChain (chunking intelligent)
   ↓
Batching (10 chunks/batch)
   ↓
Italian-Legal-BERT (768 dims)
   ↓
ChromaDB (stockage vectoriel)
   ↓
Query → Italian-BERT → ChromaDB → Top K docs
   ↓
Ollama (génération réponse)
   ↓
Réponse + Sources
```

## 📚 Documentation Swagger

Toute la documentation API interactive: **http://localhost:3000/api**

---

**Version:** 1.0  
**Date:** 7 octobre 2025  
**Status:** ✅ Production Ready
