from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import cv2
import pytesseract
import mediapipe as mp
import numpy as np
import secrets
import json
from datetime import datetime, timedelta
import hashlib
from PIL import Image
import io

app = FastAPI(title="Onboarding Biométrico - Prototipo Lo-Fi")

origins = ["*"]  

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        
    allow_credentials=True,
    allow_methods=["*"],          
    allow_headers=["*"],
)

# ------------- MODELOS DE DATOS -------------
class OCRResponse(BaseModel):
    nombre: str = ""
    documento: str = ""
    fecha_nacimiento: str = ""
    domicilio: str = ""
    is_valid: bool = False
    raw_text: str = ""

class KeyResponse(BaseModel):
    token: str
    exp: str

class SurveyInput(BaseModel):
    user: str
    rating: int
    feedback: str

# ------------- ENDPOINT: OCR RECOGNITION -------------
@app.post("/ocr", response_model=OCRResponse)
async def ocr_reader(file: UploadFile = File(...)):
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data))
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    scaled = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_LINEAR)
    img_cv = cv2.bilateralFilter(scaled, d=9, sigmaColor=75, sigmaSpace=75)

    # OCR con Tesseract
    try:
        text = pytesseract.image_to_string(img_cv, lang="spa")
    except Exception:
        text = pytesseract.image_to_string(img_cv)
    print("Texto detectado:", text)

    nombre = ""
    documento = ""
    fecha_nacimiento = ""
    
    lines = text.split("\n")
    
    for i, line in enumerate(lines):
        if not line:
            continue
        low = line.lower()
        if "nombre" in low or "eee"in low:
            nombre = lines[i+2] + " " + lines[i+3] + " " + lines[i+4]
        if "ine" in line or "id" in line or "INSTITUTO NACIONAL" in line or "documento" in low:
            documento = line.strip()
        if any(ch.isdigit() for ch in line) and ("199" in line or "200" in line or '/' in line):
            fecha_nacimiento = line.strip()
        if "domicilio" in low:
            domicilio = lines[i+2] + ", " + lines[i+3] + ", " + lines[i+4]

    is_valid = nombre != "" and documento != ""
    return OCRResponse(
        nombre=nombre,
        documento=documento,
        fecha_nacimiento=fecha_nacimiento,
        domicilio=domicilio,
        is_valid=is_valid,
        raw_text=text
    )

# ------------- ENDPOINT: FACE RECOGNITION -------------
@app.post("/face-recognition")
async def face_recognition(file: UploadFile = File(...)):
    image_data = await file.read()
    nparr = np.frombuffer(image_data, np.uint8)
    bgr_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if bgr_image is None:
        return JSONResponse({"detected": False, "message": "No se pudo decodificar la imagen"}, status_code=400)

    rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)

    detections_out = []
    with mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.9) as detector:
        results = detector.process(rgb_image)
        if results.detections:
            for detection in results.detections:
                score = detection.score[0] if detection.score else 0.0
                if score < 0.6:
                    continue
                bbox = detection.location_data.relative_bounding_box
                detections_out.append(
                    {
                        "confidence": float(score),
                        "box": {
                            "xmin": float(bbox.xmin),
                            "ymin": float(bbox.ymin),
                            "width": float(bbox.width),
                            "height": float(bbox.height),
                        },
                    }
                )

    if not detections_out:
        return JSONResponse({"detected": False, "message": "No se detectó un rostro"}, status_code=200)

    return JSONResponse({"detected": True, "count": len(detections_out), "faces": detections_out})

# ------------- ENDPOINT: LIVENESS DETECTION -------------
@app.post("/liveness")
async def liveness_check(file: UploadFile = File(...)):
    image_data = await file.read()
    nparr = np.frombuffer(image_data, np.uint8)
    bgr_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if bgr_image is None:
        return JSONResponse({"liveness": False, "message": "No se pudo decodificar la imagen"}, status_code=400)

    height, width = bgr_image.shape[:2]
    rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)

    with mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.95) as detector:
        detection_result = detector.process(rgb_image)

    if not detection_result.detections:
        return JSONResponse({"liveness": False, "message": "No rostro detectado"}, status_code=200)

    detection = max(detection_result.detections, key=lambda d: d.score[0] if d.score else 0.0)
    score = detection.score[0] if detection.score else 0.0
    if score < 0.65:
        return JSONResponse({"liveness": False, "message": "Confianza insuficiente en la detección de rostro"}, status_code=200)

    bbox = detection.location_data.relative_bounding_box
    x1 = max(0, int(bbox.xmin * width))
    y1 = max(0, int(bbox.ymin * height))
    x2 = min(width, int((bbox.xmin + bbox.width) * width))
    y2 = min(height, int((bbox.ymin + bbox.height) * height))

    if x2 <= x1 or y2 <= y1:
        return JSONResponse({"liveness": False, "message": "No se pudo aislar el rostro"}, status_code=200)

    face_roi = bgr_image[y1:y2, x1:x2]
    if face_roi.size == 0:
        return JSONResponse({"liveness": False, "message": "Rostro inválido en la imagen"}, status_code=200)

    # Simple sharpness check to avoid obvious printed images
    variance_of_laplacian = cv2.Laplacian(face_roi, cv2.CV_64F).var()
    if variance_of_laplacian < 15.0:
        return JSONResponse({"liveness": False, "message": "Imagen demasiado borrosa para validar liveness"}, status_code=200)

    # Skin tone heuristic in YCrCb space
    ycrcb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2YCrCb)
    lower = np.array([0, 135, 85], dtype=np.uint8)
    upper = np.array([255, 180, 135], dtype=np.uint8)
    skin_mask = cv2.inRange(ycrcb, lower, upper)
    skin_ratio = cv2.countNonZero(skin_mask) / float(face_roi.shape[0] * face_roi.shape[1])
    if skin_ratio < 0.5:
        return JSONResponse({"liveness": False, "message": "Proporción de piel insuficiente (posible objeto o imagen artificial)"}, status_code=200)

    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        refine_landmarks=True,
        max_num_faces=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.7,
    ) as face_mesh:
        mesh_result = face_mesh.process(rgb_image)

    if not mesh_result.multi_face_landmarks:
        return JSONResponse({"liveness": False, "message": "No se detectaron landmarks faciales"}, status_code=200)

    landmarks = mesh_result.multi_face_landmarks[0].landmark

    def _point(index: int) -> np.ndarray:
        lm = landmarks[index]
        return np.array([lm.x * width, lm.y * height], dtype=np.float32)

    def _distance(p1: np.ndarray, p2: np.ndarray) -> float:
        return float(np.linalg.norm(p1 - p2))

    left_eye_vertical = _distance(_point(159), _point(145))
    left_eye_horizontal = _distance(_point(33), _point(133))
    right_eye_vertical = _distance(_point(386), _point(374))
    right_eye_horizontal = _distance(_point(362), _point(263))
    mouth_vertical = _distance(_point(13), _point(14))
    mouth_horizontal = _distance(_point(61), _point(291))

    eye_ratio_left = left_eye_vertical / left_eye_horizontal if left_eye_horizontal else 0.0
    eye_ratio_right = right_eye_vertical / right_eye_horizontal if right_eye_horizontal else 0.0
    mouth_ratio = mouth_vertical / mouth_horizontal if mouth_horizontal else 0.0

    valid_eye = 0.15 <= eye_ratio_left <= 0.45 and 0.15 <= eye_ratio_right <= 0.45
    valid_mouth = 0.05 <= mouth_ratio <= 0.6

    return JSONResponse(
        {
            "liveness": True,
            "message": "Liveness PASS (detección heurística)",
            "metrics": {
                "confidence": score,
                "eye_ratio_left": eye_ratio_left,
                "eye_ratio_right": eye_ratio_right,
                "mouth_ratio": mouth_ratio,
                "skin_ratio": skin_ratio,
                "sharpness": variance_of_laplacian,
            },
        },
        status_code=200,
    )

# ------------- ENDPOINT: GENERAR LLAVE DIGITAL -------------
@app.post("/generate-key", response_model=KeyResponse)
async def generate_key(user: str = Form(...), room: str = Form(...), duration: int = Form(default=30)):
    payload = {
        "user": user,
        "room": room,
        "iat": datetime.utcnow().isoformat() + "Z",
        "exp": (datetime.utcnow() + timedelta(minutes=duration)).isoformat() + "Z"
    }
    secret = "prototype_secret"
    signature = hashlib.sha256((user + room + secret).encode()).hexdigest()
    token = secrets.token_urlsafe(16) + "." + signature[:16]
    return KeyResponse(token=token, exp=payload["exp"])

# ------------- ENDPOINT: ENCUESTA POST-PRUEBA -------------
SURVEY_DATA = []

@app.post("/survey")
async def submit_survey(data: SurveyInput):
    SURVEY_DATA.append(data.dict())
    return {"status": "success", "message": "Encuesta registrada"}

@app.get("/survey-results")
async def get_survey_results():
    return SURVEY_DATA

# ------------- HEALTH -------------
@app.get("/")
async def root():
    return {"status": "ok", "service": "onboarding-biometric"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
