FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data static/uploads

EXPOSE 8000

ENV FLASK_DEBUG=0

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app:app"]