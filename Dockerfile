FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/app/data

WORKDIR /app
COPY ai_engine.py bot.py knowledge.json ./

RUN useradd --create-home --uid 10001 botuser \
    && mkdir -p /app/data \
    && chown -R botuser:botuser /app

USER botuser
VOLUME ["/app/data"]
CMD ["python", "bot.py"]
