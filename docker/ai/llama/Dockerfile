FROM ollama/ollama:latest

# Start ollama server in background, pull model, then stop
RUN ollama serve & \
    sleep 5 && \
    ollama pull llama3.2:3b && \
    pkill ollama
