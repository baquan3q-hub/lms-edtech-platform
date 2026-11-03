FROM python:3.14-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY metrics.py worker.py ./
USER 65532:65532
CMD ["python", "-u", "worker.py"]
