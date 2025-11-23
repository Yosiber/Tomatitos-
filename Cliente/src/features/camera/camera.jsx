import { useState, useRef, useEffect } from "react";
import "./camera.css";

const CameraCapture = ({ onPictureTaken, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // usar ref para mantener la referencia al stream

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!mounted) {
          // en caso de que se haya desmontado antes de asignar
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        // Notificar al padre que cancele la cámara
        if (onCancel) onCancel();
      }
    };

    startCamera();

    return () => {
      mounted = false;
      // cleanup: detener todos los tracks si existen
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch (e) {}
      }
    };
  }, [onCancel]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
  };

  const handleTakePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg");

      // detener la cámara inmediatamente antes de salir
      stopStream();

      if (onPictureTaken) onPictureTaken(imageData);
    }
  };

  const handleCancel = () => {
    stopStream();
    if (onCancel) onCancel();
  };

  return (
    <div className="camera-container">
      <video ref={videoRef} autoPlay className="camera-video"></video>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      <div className="buttons is-centered mt-4">
        <button className="button is-primary" onClick={handleTakePicture}>
          Tomar Foto
        </button>

        <button className="button" onClick={handleCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;