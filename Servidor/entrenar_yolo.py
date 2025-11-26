from ultralytics import YOLO

if __name__ == '__main__':
    # Cargar modelo base de SEGMENTACIÓN (no detección)
    model = YOLO("yolo11n-seg.pt")  # ¡IMPORTANTE! El modelo -seg es para segmentación

    # Entrenar el modelo de segmentación
    model.train(
        data="C:/programacion/data_science_course/tomato-identifier/roboflow_dataset/data.yaml",
        epochs=50,       # número de épocas para segmentación
        imgsz=512,       # tamaño reducido para 4GB VRAM
        batch=2,         # batch pequeño para segmentación con 4GB VRAM
        device=0,        # GPU RTX 3050
        workers=2,       # workers reducidos para ahorrar RAM
        patience=10,     # early stopping si no mejora en 10 épocas
        name="tomato_segmentation"  # nombre del experimento
    )
