# Backend - FastAPI Onboarding Biométrico (Prototype)

## Requisitos
- Python 3.8+
- Tesseract OCR instalado en el sistema (agregar al PATH)
- Recomendado usar un entorno virtual

## Instalación rápida
pip install -r requirements.txt

## Ejecutar
uvicorn main:app --reload

## Endpoints
- POST /ocr  (multipart: file)
- POST /face-recognition (multipart: file)
- POST /liveness (multipart: file)
- POST /generate-key (form: user, room, duration)
- POST /survey (json body)
- GET /survey-results
