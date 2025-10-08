# LexConsilia

## 📖 Description

LexConsilia est un système RAG (Retrieval-Augmented Generation) intelligent conçu pour la gestion et la consultation de documents juridiques. Il combine ChromaDB pour le stockage vectoriel, Ollama pour la génération de réponses, et NestJS pour une API robuste et performante.

### ✨ Fonctionnalités principales

- 📚 **Indexation intelligente** de documents juridiques (lois, jurisprudence, articles)
- 🔍 **Recherche sémantique** avancée dans la base vectorielle
- 🤖 **IA locale** avec Ollama (modèles Llama, Mistral, etc.)
- 📄 **Support PDF** avec extraction de texte automatique
- 🔄 **Déduplication automatique** des documents
- 💬 **Consultation interactive** avec génération de réponses contextuelles
- 📊 **Analyse de documents** à la volée sans indexation

## 🚀 Installation rapide

### Prérequis

- Node.js 18+
- Docker et Docker Compose
- npm ou yarn

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer les services Docker (ChromaDB, Ollama, MongoDB)
cd docker
docker-compose up -d

# 3. Installer un modèle Ollama
docker exec -it ai-server ollama pull llama2

# 4. Démarrer l'application
npm run start:dev
```

L'application sera disponible sur:

- **API**: `http://localhost:3000`
- **Swagger**: `http://localhost:3000/api`

## 📚 Documentation complète

- **[RAG_DOCUMENTATION.md](./RAG_DOCUMENTATION.md)** - Documentation complète de l'API
- **[SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md)** - Guide d'utilisation Swagger
- **[ITALIAN_LEGAL_BERT_SETUP.md](./ITALIAN_LEGAL_BERT_SETUP.md)** - 🇮🇹 Configuration pour le droit italien
- **[MODELE_ITALIEN_ANALYSE.md](./MODELE_ITALIEN_ANALYSE.md)** - Analyse des modèles italiens
- **[http://localhost:3000/api](http://localhost:3000/api)** - Documentation Swagger interactive (après démarrage)

## 🎯 Utilisation rapide

### Indexer un document

```bash
curl -X POST http://localhost:3000/rag/index/text \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Votre contenu juridique...",
    "type": "LAW",
    "metadata": {"title": "Titre du document"}
  }'
```

### Indexer un PDF

```bash
curl -X POST http://localhost:3000/rag/index/pdf \
  -F "file=@document.pdf"
```

### Consulter le modèle

```bash
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Votre question juridique?",
    "type": "QUESTION"
  }'
```

## 🏗️ Architecture

```
src/
├── constants/          # Enums (DocumentTypesEnum, QueryTypesEnum)
├── interfaces/         # Interfaces TypeScript
├── rag/
│   ├── dto/           # Data Transfer Objects
│   ├── services/      # Services métier
│   │   ├── chromadb.service.ts
│   │   ├── ollama.service.ts
│   │   ├── document-processor.service.ts
│   │   └── rag.service.ts
│   ├── rag.controller.ts
│   └── rag.module.ts
└── app.module.ts
```

## 🔧 Configuration

Créez un fichier `.env` à la racine:

```env
PORT=3000
CHROMADB_URL=http://localhost:8000
OLLAMA_URL=http://localhost:11434
MONGODB_URI=mongodb://root:root@localhost:27017/lexconsilia?authSource=admin
```

## 🐳 Services Docker

- **ChromaDB**: `http://localhost:8000` - Base vectorielle
- **Ollama**: `http://localhost:11434` - Modèle IA
- **MongoDB**: `localhost:27017` - Base de données

## 📋 API Endpoints

| Méthode | Endpoint           | Description                     |
| ------- | ------------------ | ------------------------------- |
| POST    | `/rag/index/text`  | Indexer un document texte       |
| POST    | `/rag/index/pdf`   | Indexer un fichier PDF          |
| POST    | `/rag/index/pdfs`  | Indexer plusieurs PDFs          |
| POST    | `/rag/query`       | Poser une question au système   |
| POST    | `/rag/analyze/pdf` | Analyser un PDF sans indexation |
| GET     | `/rag/stats`       | Obtenir les statistiques        |

## 🧪 Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## 🛠️ Technologies utilisées

- **NestJS** - Framework backend
- **ChromaDB** - Base de données vectorielle
- **Ollama** - Modèle IA local (Llama2/3, Mistral, etc.)
- **TypeScript** - Langage de programmation
- **Docker** - Conteneurisation
- **pdf-parse** - Extraction de texte PDF

## 🔐 Sécurité

- Validation automatique des entrées avec `class-validator`
- Limitation de taille des fichiers uploadés
- Déduplication pour éviter la pollution de la base

## 📝 Licence

Ce projet est sous licence MIT.

---

Construit avec ❤️ en utilisant [NestJS](https://nestjs.com/)
