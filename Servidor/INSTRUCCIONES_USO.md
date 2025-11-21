# Cómo usar el modelo de segmentación de tomates

## Archivos necesarios

1. **Modelo entrenado**: `yolo.pt` (el modelo de segmentación de tomates)
2. **Script de predicción**: `predecir_tomate.py`

## Instalación 

```bash
# 1. Crear entorno virtual con Python 3.11
python -m venv venv_tomate

# 2. Activar entorno
# En Windows:
venv_tomate\Scripts\activate
# 3. Instalar dependencias
pip install ultralytics opencv-python pillow numpy
```

## Uso

```python
# Poner la imagen a analizar en la misma carpeta que yolo.pt
# Ejecutar:
python predecir_tomate.py tu_imagen.jpg
```

## Clases detectadas

- **damaged** (dañado): Tomates con daños físicos
- **old** (viejo): Tomates sobre-maduros o en descomposición
- **ripe** (maduro): Tomates maduros listos para consumo
- **unripe** (verde): Tomates aún no maduros

## Resultado

El script generará un archivo `resultado_segmentacion.jpg` con:
- Máscaras de segmentación de colores vibrantes
- Etiquetas con el tipo de tomate y nivel de confianza
- Sin cajas, solo contornos y máscaras
