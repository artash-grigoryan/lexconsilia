FROM ollama/ollama:latest

# Start ollama server in background, pull model, then stop
RUN ollama serve & \
    sleep 5 && \
    ollama pull mistral && \
    pkill ollama
