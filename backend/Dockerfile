FROM python:3.11-slim

WORKDIR /app

# Copy comparator module
COPY ../comparator /app/comparator

# Copy backend
COPY . /app/backend

WORKDIR /app/backend

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
