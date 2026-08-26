# Rival Hub - Full Stack Web App
FROM python:3.11-slim

# Install Node.js 20 for frontend build (required by lru-cache@11.3.3+),
# and ffmpeg for highlight video compression/resizing (backend/server.py
# shells out to ffmpeg/ffprobe — without it, video uploads silently skip
# compression entirely and store the raw original).
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend and build
COPY frontend/ ./frontend/
WORKDIR /app/frontend
# Use --ignore-engines to bypass Node version checks in cached builds
RUN yarn install --frozen-lockfile --ignore-engines || yarn install --ignore-engines
RUN yarn build:web

# Copy backend code
WORKDIR /app
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8001

# Expose port
EXPOSE 8001

# Start the server
WORKDIR /app/backend
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
