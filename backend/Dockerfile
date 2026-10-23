FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 SPECTRE_PROJECT_ROOT=/app
WORKDIR /app
COPY backend /app/backend
COPY datasets /app/datasets
RUN pip install --no-cache-dir /app/backend && useradd --uid 10001 --create-home spectre && mkdir /app/data && chown -R spectre:spectre /app/data
USER 10001:10001
EXPOSE 8100
CMD ["python", "-m", "uvicorn", "spectre.main:app", "--host", "0.0.0.0", "--port", "8100", "--no-access-log"]
