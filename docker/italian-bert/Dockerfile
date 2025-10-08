FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Installer les packages Python
# Utiliser des versions compatibles pour ARM64
RUN pip install --no-cache-dir \
    numpy==1.24.3 \
    torch==2.0.1 \
    transformers==4.36.0 \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.0

# Copier le serveur
COPY server.py /app/

# Exposer le port
EXPOSE 80

# Démarrer le serveur
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "80"]

