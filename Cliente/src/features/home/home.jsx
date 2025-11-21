import React, { useState, useRef } from "react";
import "./home.css";

export default function HomePage() {
  const [mode, setMode] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setError("");
      setResultImage(null);
      setClassificationResult(null);
    }
  };

  const handleLoadNewImage = () => {
    setResultImage(null);
    setUploadedImage(null);
    setError("");
    setClassificationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBack = () => {
    setMode(null);
    setUploadedImage(null);
    setResultImage(null);
    setClassificationResult(null);
    setModel("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSegmentar = async () => {
    if (!uploadedImage) {
      setError("Por favor carga una imagen");
      return;
    }

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la segmentación");
      }

      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);
      setResultImage(resultUrl);
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClasificar = async () => {
    if (!uploadedImage) {
      setError("Por favor carga una imagen");
      return;
    }

    if (!model) {
      setError("Por favor selecciona un modelo");
      return;
    }

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

  return (
    <div className="home-container">
      {!mode && (
        <div className="mode-selection">
          <h1>🍅 Análisis de Tomates</h1>
          <p>Selecciona una opción para comenzar</p>
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={() => setMode("classification")}
            >
              📊 Clasificación
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setMode("segmentation")}
            >
              🎯 Segmentación
            </button>
          </div>
        </div>
      )}

      {mode === "classification" && (
        <div className="content-section">
          <button className="btn btn-back" onClick={handleBack}>
            ← Atrás
          </button>

          <h2>📊 Clasificación de Tomates</h2>

          {!classificationResult && (
            <>
              <div className="form-group">
                <label>Seleccionar modelo</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="select-model"
                >
                  <option value="">-- Elige un modelo --</option>
                  <option value="modelo1">Modelo 1 (MobileNetV2)</option>
                  <option value="modelo2">Modelo 2 (EfficientNet)</option>
                  <option value="modelo3">Modelo 3 (ResNet50)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cargar imagen</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input"
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          {uploadedImage && !classificationResult && (
            <div className="preview-section">
              <img
                src={URL.createObjectURL(uploadedImage)}
                alt="preview"
                className="preview-image"
              />
              <button
                className="btn btn-action"
                onClick={handleClasificar}
                disabled={loading}
              >
                {loading ? "⏳ Procesando..." : "Clasificar"}
              </button>
            </div>
          )}

          {classificationResult && (
            <div className="result-section">
              <h3>✅ Resultado de Clasificación</h3>
              <p>
                <strong>Modelo:</strong> {classificationResult.modelo}
              </p>
              <p>
                <strong>Clase:</strong> {classificationResult.clase}
              </p>
              <p>
                <strong>Probabilidad:</strong> {classificationResult.probabilidad}%
              </p>
              <button className="btn btn-back" onClick={handleLoadNewImage}>
                📸 Cargar otra imagen
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "segmentation" && (
        <div className="content-section">
          <button className="btn btn-back" onClick={handleBack}>
            ← Atrás
          </button>

          <h2>🎯 Segmentación de Tomates</h2>

          {!resultImage && (
            <div className="form-group">
              <label>Cargar imagen</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {uploadedImage && !resultImage && (
            <div className="preview-section">
              <img
                src={URL.createObjectURL(uploadedImage)}
                alt="preview"
                className="preview-image"
              />
              <button
                className="btn btn-action"
                onClick={handleSegmentar}
                disabled={loading}
              >
                {loading ? "⏳ Segmentando..." : "🔍 Segmentar"}
              </button>
            </div>
          )}

          {resultImage && (
            <div className="result-section">
              <h3>✅ Resultado de Segmentación</h3>
              <img src={resultImage} alt="resultado" className="preview-image" />
              <div className="legend">
                <p>
                  <span className="legend-red" /> Dañado
                </p>
                <p>
                  <span className="legend-orange" /> Viejo/Sobre-maduro
                </p>
                <p>
                  <span className="legend-green" /> Maduro
                </p>
                <p>
                  <span className="legend-cyan" /> Verde/No maduro
                </p>
              </div>
              <button className="btn btn-back" onClick={handleLoadNewImage}>
                📸 Cargar otra imagen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
