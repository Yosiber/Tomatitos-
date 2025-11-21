import React, { useState } from "react";
import "./home.css";

export default function HomePage() {
  const [mode, setMode] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setError("");
    }
  };

  const handleBack = () => {
    setMode(null);
    setUploadedImage(null);
    setResultImage(null);
    setModel("");
    setError("");
  };

  const handleSegmentar = async () => {
    if (!uploadedImage) {
      setError("Por favor carga una imagen");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("imagen", uploadedImage);

      const response = await fetch("http://localhost:5000/segmentar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
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

    try {
      const formData = new FormData();
      formData.append("imagen", uploadedImage);
      formData.append("modelo", model);

      const response = await fetch("http://localhost:5000/clasificar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la clasificación");
      }

      const data = await response.json();
      setResultImage(data.resultado);
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
          
          <div className="form-group">
            <label>Seleccionar modelo</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="select-model"
            >
              <option value="">-- Elige un modelo --</option>
              <option value="modelo1">Modelo 1</option>
              <option value="modelo2">Modelo 2</option>
              <option value="modelo3">Modelo 3</option>
            </select>
          </div>

          <div className="form-group">
            <label>Cargar imagen</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="file-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {uploadedImage && !resultImage && (
            <div className="preview-section">
              <img src={URL.createObjectURL(uploadedImage)} alt="preview" className="preview-image" />
              <button 
                className="btn btn-action" 
                onClick={handleClasificar}
                disabled={loading}
              >
                {loading ? "⏳ Procesando..." : "Clasificar"}
              </button>
            </div>
          )}

          {resultImage && (
            <div className="result-section">
              <h3>✅ Resultado</h3>
              <img src={resultImage} alt="resultado" className="preview-image" />
              <button className="btn btn-back" onClick={() => {
                setResultImage(null);
                setUploadedImage(null);
              }}>
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

          <div className="form-group">
            <label>Cargar imagen</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="file-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {uploadedImage && !resultImage && (
            <div className="preview-section">
              <img src={URL.createObjectURL(uploadedImage)} alt="preview" className="preview-image" />
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
                <p><span className="legend-red"></span> Dañado</p>
                <p><span className="legend-orange"></span> Viejo/Sobre-maduro</p>
                <p><span className="legend-green"></span> Maduro</p>
                <p><span className="legend-cyan"></span> Verde/No maduro</p>
              </div>
              <button className="btn btn-back" onClick={() => {
                setResultImage(null);
                setUploadedImage(null);
              }}>
                📸 Cargar otra imagen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}