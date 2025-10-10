"""
Serveur Italian-Legal-BERT pour embeddings juridiques italiens
Compatible ARM64 (Apple Silicon)
CORRIGÉ: Utilise [CLS] token comme dans le Colab officiel
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F
from typing import List, Union
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Italian-Legal-BERT Embeddings API")

# Modèle global
MODEL_NAME = "dlicari/Italian-Legal-BERT"
tokenizer = None
model = None
device = None


class EmbedRequest(BaseModel):
    inputs: Union[str, List[str]]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


@app.on_event("startup")
async def load_model():
    """Charge le modèle au démarrage"""
    global tokenizer, model, device
    
    try:
        logger.info(f"🇮🇹 Loading Italian-Legal-BERT model: {MODEL_NAME}")
        logger.info("This may take a few minutes on first run...")
        
        # Détecter le device disponible
        if torch.backends.mps.is_available():
            device = torch.device("mps")
            logger.info("🚀 Using Apple Silicon GPU (MPS)")
        elif torch.cuda.is_available():
            device = torch.device("cuda")
            logger.info("🚀 Using NVIDIA GPU (CUDA)")
        else:
            device = torch.device("cpu")
            logger.info("⚠️  Using CPU (slower)")
        
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModel.from_pretrained(MODEL_NAME)
        model.to(device)
        
        # Mode évaluation
        model.eval()
        
        logger.info("✅ Italian-Legal-BERT model loaded successfully!")
        logger.info(f"📍 Model running on: {device}")
        logger.info("Ready to generate embeddings for Italian legal documents")
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        raise


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Génère les embeddings en utilisant le [CLS] token
    Exactement comme dans le Colab officiel Italian-Legal-BERT
    """
    all_embeddings = []
    BATCH_SIZE = 16
    
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        
        # Tokenization
        encoded_input = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors='pt'
        ).to(device)
        
        # Forward pass
        with torch.no_grad():
            model_output = model(**encoded_input)
        
        # ✅ CORRECTION: Utiliser le [CLS] token (premier token)
        # Comme dans le Colab officiel
        sentence_embeddings = model_output[0][:, 0]  # Shape: [batch_size, 768]
        
        # ✅ Normalisation L2 (comme dans le Colab)
        sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)
        
        all_embeddings.extend(sentence_embeddings.cpu().tolist())
    
    return all_embeddings


@app.get("/health")
async def health():
    """Endpoint de santé"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": str(device),
        "method": "CLS token pooling (official)",
        "architecture": "ARM64/x86_64 compatible"
    }


@app.post("/embed")
async def embed(request: EmbedRequest) -> List[List[float]]:
    """Génère les embeddings pour un ou plusieurs textes"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    texts = [request.inputs] if isinstance(request.inputs, str) else request.inputs
    logger.info(f"🇮🇹 Generating embeddings for {len(texts)} text(s)")

    try:
        embeddings = get_embeddings(texts)
        logger.info(f"✅ Generated {len(embeddings)} embeddings of dimension {len(embeddings[0])}")
        return embeddings

    except Exception as e:
        logger.error(f"❌ Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/legacy", deprecated=True)
async def embed_legacy(request: EmbedRequest) -> List[List[float]]:
    """
    ANCIENNE MÉTHODE (mean pooling)
    Gardée pour compatibilité mais DÉPRÉCIÉ
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    texts = [request.inputs] if isinstance(request.inputs, str) else request.inputs
    logger.warning(f"⚠️  Using DEPRECATED mean pooling method for {len(texts)} text(s)")

    try:
        BATCH_SIZE = 16
        all_embeddings = []

        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            encoded_input = tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            ).to(device)

            with torch.no_grad():
                model_output = model(**encoded_input)

            # Ancien mean pooling (incorrect pour ce modèle)
            token_embeddings = model_output[0]
            input_mask_expanded = encoded_input['attention_mask'].unsqueeze(-1).expand(token_embeddings.size()).float()
            embeddings = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
            embeddings = F.normalize(embeddings, p=2, dim=1)
            all_embeddings.extend(embeddings.cpu().tolist())

        logger.warning(f"⚠️  Generated {len(all_embeddings)} embeddings using DEPRECATED method")
        return all_embeddings

    except Exception as e:
        logger.error(f"❌ Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Page d'accueil"""
    return {
        "name": "Italian-Legal-BERT Embeddings API",
        "model": MODEL_NAME,
        "description": "Embeddings spécialisés pour documents juridiques italiens",
        "method": "CLS token pooling (official method)",
        "dimension": 768,
        "endpoints": {
            "/health": "Health check",
            "/embed": "Generate embeddings (POST) - Official method",
            "/embed/legacy": "Generate embeddings (POST) - Deprecated mean pooling",
        },
        "compatible": "ARM64 (Apple Silicon) and x86_64"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)