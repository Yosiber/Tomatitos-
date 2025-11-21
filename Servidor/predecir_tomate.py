from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import io
import tempfile
import numpy as np
from PIL import Image
import tensorflow as tf
import cv2
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# ============================================
#   MODELOS DE CLASIFICACIÓN
# ============================================

MODEL_PATHS = {
    "modelo1": "models/MobileNetV2.keras",
    "modelo2": "models/EfficientNetB0.keras",
    "modelo3": "models/ResNet50.keras"
}

CLASS_NAMES = ["Damaged", "Old", "Ripe", "Unripe"]

loaded_models = {}

def load_model(model_key):
    """Carga el modelo solo una vez y lo deja en caché."""
    if model_key not in MODEL_PATHS:
        raise ValueError("Modelo no válido")

    if model_key not in loaded_models:
        model_path = MODEL_PATHS[model_key]

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"No se encontró el modelo: {model_path}")

        print(f"Cargando modelo {model_key}...")
        loaded_models[model_key] = tf.keras.models.load_model(model_path)
        print(f"Modelo {model_key} cargado.")
    
    return loaded_models[model_key]


def preprocess_image(image_bytes):
    """Prepara una imagen para TF."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array


@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No se encontró archivo 'file'"}), 400
    
    if "modelo" not in request.form:
        return jsonify({"error": "Debes enviar el modelo"}), 400

    file = request.files["file"]
    model_key = request.form["modelo"]

    if file.filename == "":
        return jsonify({"error": "Nombre de archivo vacío"}), 400

    try:
        image_bytes = file.read()
        img_array = preprocess_image(image_bytes)

        model = load_model(model_key)

        preds = model.predict(img_array)
        class_index = np.argmax(preds[0])
        confidence = float(np.max(preds[0]))

        response = {
            "modelo_usado": model_key,
            "clase_predicha": CLASS_NAMES[class_index],
            "probabilidad": round(confidence * 100, 2)
        }

        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================
#   MODELO DE SEGMENTACIÓN (YOLO)
# ============================================

def segmentar_tomates(image_path, model_path=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if model_path is None:
        model_path = os.path.join(script_dir, "yolo.pt")

    if not os.path.exists(model_path):
        raise FileNotFoundError("No se encontró el modelo YOLO (yolo.pt)")

    model = YOLO(model_path)

    results = model.predict(
        source=image_path,
        conf=0.25,
        retina_masks=True,
        verbose=False
    )

    img = cv2.imread(image_path)
    
    if img is None:
        raise ValueError("No se pudo leer la imagen")

    img_copy = img.copy()
    overlay = img.copy()
    result = results[0]

    # Colores para clases YOLO
    COLORS = {
        "damaged": (0, 0, 255),
        "old": (0, 165, 255),
        "ripe": (0, 255, 0),
        "unripe": (255, 255, 0)
    }

    if result.masks is not None and len(result.boxes) > 0:
        masks = result.masks.data.cpu().numpy()
        boxes = result.boxes

        for mask, box in zip(masks, boxes):
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            class_name = result.names[cls]
            color = COLORS.get(class_name, (255, 255, 255))

            mask_resized = cv2.resize(mask, (img.shape[1], img.shape[0]))
            mask_bool = mask_resized > 0.5

            overlay[mask_bool] = overlay[mask_bool] * 0.4 + np.array(color) * 0.6

            contours, _ = cv2.findContours(
                (mask_bool * 255).astype(np.uint8),
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            cv2.drawContours(overlay, contours, -1, color, 3)

            x1, y1 = int(box.xyxy[0][0]), int(box.xyxy[0][1])
            label = f"{class_name} {conf:.2f}"

            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(overlay, (x1, y1 - h - 10), (x1 + w + 10, y1), color, -1)
            cv2.putText(overlay, label, (x1 + 5, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        output = cv2.addWeighted(img_copy, 0.3, overlay, 0.7, 0)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        cv2.imwrite(tmp.name, output)

        return tmp.name

    return None


@app.route("/segmentar", methods=["POST"])
def api_segmentar():
    if "imagen" not in request.files:
        return jsonify({"error": "No se envió una imagen"}), 400

    image = request.files["imagen"]

    tmp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    image.save(tmp_input.name)

    try:
        result = segmentar_tomates(tmp_input.name)

        if result is None:
            return jsonify({"message": "No se detectaron tomates"}), 200
        
        return send_file(result, mimetype="image/jpeg")

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ============================================
# EJECUCIÓN
# ============================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
