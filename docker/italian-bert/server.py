"""
Serveur Italian-Legal-BERT pour embeddings juridiques italiens
Compatible ARM64 (Apple Silicon)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel
import torch
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


class EmbedRequest(BaseModel):
    inputs: Union[str, List[str]]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


@app.on_event("startup")
async def load_model():
    """Charge le modèle au démarrage"""
    global tokenizer, model
    
    try:
        logger.info(f"🇮🇹 Loading Italian-Legal-BERT model: {MODEL_NAME}")
        logger.info("This may take a few minutes on first run...")
        
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModel.from_pretrained(MODEL_NAME)
        
        # Mode évaluation
        model.eval()
        
        logger.info("✅ Italian-Legal-BERT model loaded successfully!")
        logger.info("Ready to generate embeddings for Italian legal documents")
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        raise


def mean_pooling(model_output, attention_mask):
    """Pool les embeddings avec attention mask"""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)


@app.get("/health")
async def health():
    """Endpoint de santé"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": "cpu",
        "architecture": "ARM64/x86_64 compatible"
    }


@app.post("/embed")
async def embed(request: EmbedRequest) -> List[List[float]]:
    """Génère des embeddings pour du texte"""
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Convertir en liste si string unique
        texts = [request.inputs] if isinstance(request.inputs, str) else request.inputs
        
        logger.info(f"🇮🇹 Generating embeddings for {len(texts)} text(s)")
        
        # Tokenize
        encoded_input = tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors='pt'
        )
        
        # Générer embeddings
        with torch.no_grad():
            model_output = model(**encoded_input)
        
        # Pool et normaliser
        embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        
        # Convertir en liste
        embeddings_list = embeddings.tolist()
        
        logger.info(f"✅ Generated {len(embeddings_list)} embeddings")
        
        return embeddings_list
        
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
        "endpoints": {
            "/health": "Health check",
            "/embed": "Generate embeddings (POST)",
        },
        "compatible": "ARM64 (Apple Silicon) and x86_64"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=80)

