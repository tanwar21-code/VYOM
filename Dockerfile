# syntax=docker/dockerfile:1

# Base Image: Python 3.11 slim provides optimal balance of stability, build speed, and scientific wheel availability
FROM python:3.11-slim

# Prevent Python from writing bytecode and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Install minimal OS dependencies required by OpenCV, NumPy, and image libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency definition first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend application, registration engine, and demo datasets
COPY backend/ /app/backend/
COPY registration_engine/ /app/registration_engine/
COPY data/ /app/data/

# Create and switch to non-root user for container security
RUN useradd -m -u 1000 vyomuser \
    && chown -R vyomuser:vyomuser /app

USER vyomuser

# Expose container port (Render injects $PORT at runtime)
EXPOSE 8000

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; port = os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health')" || exit 1

# Start Uvicorn bound to 0.0.0.0 and dynamic $PORT injected by Render (defaults to 8000)
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
