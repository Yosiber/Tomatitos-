from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import os
import tempfile

app = Flask(__name__)
CORS(app)

# --------------------------
# TU FUNCIÓN COMPLETA SIN ELIMINAR NADA
# --------------------------
def segmentar_tomates(image_path, model_path=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if model_path is None:
        model_path = os.path.join(script_dir, "yolo.pt")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"No se encuentra la imagen '{image_path}'")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"No se encuentra el modelo '{model_path}'")

    print(f"🔍 Analizando imagen: {image_path}")
    print(f"🤖 Usando modelo: {model_path}")

    model = YOLO(model_path)

    # Colores vibrantes para cada clase (BGR)
    COLORS = {
        'damaged': (0, 0, 255),      # Rojo brillante
        'old': (0, 165, 255),        # Naranja brillante
        'ripe': (0, 255, 0),         # Verde brillante
        'unripe': (255, 255, 0)      # Cyan brillante
    }

    # Predicción YOLO
    results = model.predict(
        source=image_path,
        conf=0.25,
        retina_masks=True,
        verbose=False
    )

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"No se pudo leer la imagen: {image_path}")

    img_copy = img.copy()
    overlay = img.copy()

    result = results[0]

    # -------------------------
    # PROCESAMIENTO VISUAL COMPLETO
    # -------------------------
    if result.masks is not None and len(result.boxes) > 0:
        masks = result.masks.data.cpu().numpy()
        boxes = result.boxes

        for i, (mask, box) in enumerate(zip(masks, boxes)):
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            class_name = result.names[cls]
            color = COLORS.get(class_name, (255, 255, 255))

            # Redimensionar máscara
            mask_resized = cv2.resize(mask, (img.shape[1], img.shape[0]))
            mask_bool = mask_resized > 0.5

            # Aplicar color
            overlay[mask_bool] = overlay[mask_bool] * 0.4 + np.array(color) * 0.6

            # Contornos
            contours, _ = cv2.findContours(
                (mask_bool * 255).astype(np.uint8),
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            cv2.drawContours(overlay, contours, -1, color, 3)

            # Etiquetas
            x1, y1 = int(box.xyxy[0][0]), int(box.xyxy[0][1])
            label = f"{class_name} {conf:.2f}"

            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(overlay, (x1, y1 - h - 10), (x1 + w + 10, y1), color, -1)
            cv2.putText(overlay, label, (x1 + 5, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Mezcla final
        result_img = cv2.addWeighted(img_copy, 0.3, overlay, 0.7, 0)

        # Guardar en archivo temporal
        out_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        cv2.imwrite(out_file.name, result_img)

        return out_file.name  # Devuelve el path

    else:
        return None


# --------------------------------------------------
# API: RECIBIR IMAGEN DEL FRONT Y DEVOLVER RESULTADO
# --------------------------------------------------
@app.route("/segmentar", methods=["POST"])
def api_segmentar():
    if "imagen" not in request.files:
        return jsonify({"error": "No enviaste ninguna imagen"}), 400

    img_file = request.files["imagen"]

    # Guardar imagen temporalmente
    tmp_input = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    img_file.save(tmp_input.name)

    try:
        resultado = segmentar_tomates(tmp_input.name)

        if resultado is None:
            return jsonify({"message": "No se detectaron tomates"}), 200

        # Devuelve la imagen segmentada al frontend
        return send_file(resultado, mimetype="image/jpeg")

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------
# EJECUTAR SERVIDOR
# --------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
