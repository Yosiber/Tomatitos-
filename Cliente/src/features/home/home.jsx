import React, { useState, useRef } from "react";
import "./home.css";
import CameraCapture from "../camera/camera";

export default function HomePage() {
  const [mode, setMode] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setPreviewUrl(null);
      setError("");
      setResultImage(null);
      setClassificationResult(null);
    }
  };

  const dataURLtoFile = (dataUrl, filename) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
  };
  
  const handlePictureTaken = async (dataUrl) => {
    try {
      const file = await dataURLtoFile(dataUrl, "camera.jpg");
      setUploadedImage(file);
      setPreviewUrl(dataUrl);
      setShowCamera(false);
      setError("");
      setResultImage(null);
      setClassificationResult(null);
    } catch (err) {
      console.error(err);
      setError("No se pudo procesar la foto de la cámara");
    }
  };

  const handleLoadNewImage = () => {
    setResultImage(null);
    setUploadedImage(null);
    setPreviewUrl(null);
    setError("");
    setClassificationResult(null);
    setShowCamera(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBack = () => {
    setMode(null);
    handleLoadNewImage();
    setModel("");
    setShowCamera(false);
  };

  async function handleSegmentar() {
    if (!uploadedImage) {
      setError("Por favor carga una imagen o toma una foto");
      return;
    }

    setShowCamera(false);

    setLoading(true);
    setError("");
    setClassificationResult(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append("imagen", uploadedImage);

      const response = await fetch("http://localhost:5000/segmentar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Error en la segmentación");
      }

      if (data.mongo_id) {
        const imgRes = await fetch(`http://localhost:5000/imagen/${data.mongo_id}`);
        if (!imgRes.ok) {
          throw new Error("No se pudo recuperar la imagen desde el servidor");
        }
        const blob = await imgRes.blob();
        const resultUrl = URL.createObjectURL(blob);
        setResultImage(resultUrl);
      } else if (data.message) {
        setError(data.message);
      } else {
        throw new Error("Respuesta inesperada del servidor");
      }
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleClasificar = async () => {
    if (!uploadedImage) {
      setError("Por favor carga una imagen o toma una foto");
      return;
    }

    if (!model) {
      setError("Por favor selecciona un modelo");
      return;
    }

    // Apagar cámara antes de procesar
    setShowCamera(false);

    setLoading(true);
    setError("");
    setResultImage(null);
    setClassificationResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedImage);
      formData.append("modelo", model);

      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la clasificación");
      }

      const data = await response.json();

      if (data.message === "No se detectaron tomates") {
        setError("❌ No se detectaron tomates");
        setClassificationResult(null);
        return;
      }

      setClassificationResult({
        modelo: data.modelo_usado,
        clase: data.clase_predicha,
        probabilidad: data.probabilidad,
      });

    } catch (err) {
      setError(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentPreviewSrc = previewUrl ? previewUrl : (uploadedImage ? URL.createObjectURL(uploadedImage) : null);

  return (
    <div className="home-container">
      {!mode && (
        <div className="mode-selection">
          <h1>🍅 Análisis de Tomates</h1>
          <p>Selecciona una opción para comenzar</p>
          <div className="button-group">
            <button className="btn btn-primary" onClick={() => setMode("classification")}>
              📊 Clasificación
            </button>
            <button className="btn btn-secondary" onClick={() => setMode("segmentation")}>
              🎯 Segmentación
            </button>
          </div>
        </div>
      )}

      {mode === "classification" && (
        <div className="content-section">
          <button className="btn btn-back" onClick={handleBack}>← Atrás</button>
          <h2>📊 Clasificación de Tomates</h2>

          {!classificationResult && (
            <>
              <div className="form-group">
                <label>Seleccionar modelo</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="select-model">
                  <option value="">-- Elige un modelo --</option>
                  <option value="MobileNetV2">Modelo 1 (MobileNetV2)</option>
                  <option value="EfficientNetB0">Modelo 2 (EfficientNet)</option>
                  <option value="ResNet50">Modelo 3 (ResNet50)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cargar imagen o tomar foto</label>
                <div className="upload-options">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
                  <button className="btn btn-camera" onClick={() => setShowCamera(true)}>📷 Cámara</button>
                </div>
              </div>
            </>
          )}

          {showCamera && !resultImage && (
            <div style={{ marginTop: 12 }}>
              <CameraCapture onPictureTaken={handlePictureTaken} onCancel={() => setShowCamera(false)} />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {currentPreviewSrc && !classificationResult && (
            <div className="preview-section">
              <img src={currentPreviewSrc} alt="preview" className="preview-image" />
              <button className="btn btn-action" onClick={handleClasificar} disabled={loading}>
                {loading ? "⏳ Procesando..." : "Clasificar"}
              </button>
            </div>
          )}

          {classificationResult && (
            <div className="result-section">
              <h3>✅ Resultado de Clasificación</h3>
              <p><strong>Modelo:</strong> {classificationResult.modelo}</p>
              <p><strong>Clase:</strong> {classificationResult.clase}</p>
              <p><strong>Probabilidad:</strong> {classificationResult.probabilidad}%</p>
              <button className="btn btn-back" onClick={handleLoadNewImage}>📸 Cargar otra imagen</button>
            </div>
          )}
        </div>
      )}

      {mode === "segmentation" && (
        <div className="content-section">
          <button className="btn btn-back" onClick={handleBack}>← Atrás</button>
          <h2>🎯 Segmentación de Tomates</h2>

          {!resultImage && (
            <div className="form-group">
              <label>Cargar imagen o tomar foto</label>
              <div className="upload-options">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
                <button className="btn btn-camera" onClick={() => setShowCamera(true)}>📷 Cámara</button>
              </div>
            </div>
          )}

          {showCamera && !resultImage && (
            <div style={{ marginTop: 12 }}>
              <CameraCapture onPictureTaken={handlePictureTaken} onCancel={() => setShowCamera(false)} />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {currentPreviewSrc && !resultImage && (
            <div className="preview-section">
              <img src={currentPreviewSrc} alt="preview" className="preview-image" />
              <button className="btn btn-action" onClick={handleSegmentar} disabled={loading}>
                {loading ? "⏳ Segmentando..." : "🔍 Segmentar"}
              </button>
            </div>
          )}

          {resultImage && (
            <div className="result-section">
              <h3>✅ Resultado de Segmentación</h3>
              <img src={resultImage} alt="resultado" className="preview-image" />
              <div className="legend">
                <p><span className="legend-red" /> Dañado</p>
                <p><span className="legend-orange" /> Viejo/Sobre-maduro</p>
                <p><span className="legend-green" /> Maduro</p>
                <p><span className="legend-cyan" /> Verde/No maduro</p>
              </div>
              <button className="btn btn-back" onClick={handleLoadNewImage}>📸 Cargar otra imagen</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
