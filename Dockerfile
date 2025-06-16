# === Build whombat backend only ===

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app

# Install GDAL and other system dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    gdal-bin \
    libgdal32 \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables for building
ENV GDAL_CONFIG=/usr/bin/gdal-config
ENV GDAL_VERSION=3.6.2

# Verify gdal-config exists
RUN which gdal-config && gdal-config --version

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=back/uv.lock,target=uv.lock \
    --mount=type=bind,source=back/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --all-extras

# Add the rest of the project source code and install it
ADD back /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --all-extras

# === Final Image ===

FROM python:3.12-slim-bookworm

# Install system dependencies, including runtime GDAL libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libexpat1 \
    libsndfile1 \
    libgdal32 \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables
ENV GDAL_DATA=/usr/share/gdal
ENV PROJ_LIB=/usr/share/proj

# Copy the application from the builder
COPY --from=builder /app /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Create a directory for audio files
RUN mkdir /audio
RUN mkdir /data

VOLUME ["/data"]

# Set the environment variables for the audio directory and the database URL
ENV WHOMBAT_AUDIO_DIR /audio
ENV WHOMBAT_DB_URL "sqlite+aiosqlite:////data/whombat.db"
ENV WHOMBAT_DEV "false"
ENV WHOMBAT_HOST "0.0.0.0"
ENV WHOMBAT_PORT "5000"
ENV WHOMBAT_LOG_LEVEL "info"
ENV WHOMBAT_LOG_TO_STDOUT "true"
ENV WHOMBAT_LOG_TO_FILE "false"
ENV WHOMBAT_OPEN_ON_STARTUP "false"
ENV WHOMBAT_DOMAIN "localhost"

# Expose the port for the web server
EXPOSE 5000

# Reset the entrypoint, don't invoke `uv`
ENTRYPOINT []

# Run the command to start the web server
CMD ["whombat"]