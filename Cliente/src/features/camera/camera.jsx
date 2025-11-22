import { useState, useRef, useEffect } from "react";
import "./camera.css";

const CameraCapture = ({ onPictureTaken, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        onCancel();
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, 
);

  const handleTakePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg");
      onPictureTaken(imageData);
    }
  };

  return (
    <div className="camera-container">
      <video ref={videoRef} autoPlay className="camera-video"></video>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      <div className="buttons is-centered mt-4">
        <button className="button is-primary" onClick={handleTakePicture}>
          Tomar Foto
        </button>

        <button className="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
