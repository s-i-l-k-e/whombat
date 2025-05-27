# Whombat - Quickstart

Open-source web-based audio annotation tool for machine learning model development.

## Prerequisites

- Python 3.8+
- Node.js 16+
- Git

## Quick Setup

### 1. Setup and run backend

1. Follow the official [installation instructions](https://docs.astral.sh/uv/#highlights) to get `uv` on your machine.

2. Install dependencies 
```bash
cd back
uv sync
```

3. Start the development server:
```bash
make serve-dev
```

### 2. Setup and run frontend (recommend using yarn or pnpm)
1. Install dependencies

```bash
pnpm install
```

2. Start the hot-reloading server
```bash
yarn dev
```