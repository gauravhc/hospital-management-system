"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Upload,
  Camera,
  X,
  Scan,
} from "lucide-react";

const PatientScanDocumentsPage = () => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [scanType, setScanType] = useState("Other");

  const scanCategories = [
    "Prescription",
    "Old Medical Report",
    "Insurance Document",
    "Billing Receipt",
    "Other",
  ];

  // Upload using file picker
  const handleFileUpload = (e) => {
    const uploaded = Array.from(e.target.files || []);

    const newFiles = uploaded.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      category: scanType,
      size: Math.round(file.size / 1024),
      url: URL.createObjectURL(file),
      date: new Date().toISOString().split("T")[0],
      type: file.type,
    }));

    setFiles((prev) => [...newFiles, ...prev]);
  };

  // Start camera
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Camera not supported");

      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      setStream(s);
      setShowCamera(true);
    } catch {
      alert("Camera not available or permission denied.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    setShowCamera(false);
  };

  // Capture scan
  const captureScan = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `scan-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const scanned = {
        id: Date.now() + Math.random(),
        name: `Scanned Document ${files.length + 1}`,
        category: scanType,
        size: Math.round(file.size / 1024),
        url: URL.createObjectURL(file),
        date: new Date().toISOString().split("T")[0],
        type: "image/jpeg",
      };

      setFiles((prev) => [scanned, ...prev]);
    });

    stopCamera();
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => { });
    }
  }, [stream]);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">

      {/* RIGHT MAIN CONTENT */}
      <main
        className="flex-1 px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl mx-auto">

          {/* HEADER */}
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900">
              Scan / Upload Documents
            </h1>
            <p className="text-slate-600">
              Quickly scan documents or upload medical files.
            </p>
          </header>

          {/* UPLOAD CARD */}
          <div className="bg-white/90 rounded-2xl shadow-xl p-6 border border-white/30">
            <h3 className="text-lg font-semibold mb-3">
              Select Document Type
            </h3>

            <div className="flex gap-3 flex-wrap mb-5">
              {scanCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setScanType(cat)}
                  className={`px-4 py-2 rounded-full border transition ${scanType === cat
                      ? "bg-sky-600 text-white"
                      : "bg-white border-slate-300 text-slate-600"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
            />

            <div className="flex gap-4">
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-medium rounded-xl shadow"
              >
                <Upload size={20} /> Upload Files
              </button>

              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl shadow"
              >
                <Camera size={20} /> Scan Now
              </button>
            </div>
          </div>

          {/* FILE LIST */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-3 text-slate-800">
              My Documents
            </h3>

            {files.length === 0 ? (
              <div className="bg-white/90 rounded-xl p-10 text-center border text-slate-600 shadow">
                <Scan size={40} className="mx-auto text-slate-400 mb-3" />
                No scanned or uploaded documents yet.
              </div>
            ) : (
              <div className="space-y-4">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white/90 p-5 rounded-xl shadow flex items-center justify-between border"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {f.name}
                      </div>
                      <div className="text-sm text-slate-500 flex gap-4 mt-1">
                        <span>{f.size} KB</span>
                        <span className="text-sky-600">{f.category}</span>
                        <span>{f.date}</span>
                      </div>
                    </div>

                    <a
                      href={f.url}
                      target="_blank"
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg"
                    >
                      Preview
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CAMERA MODAL */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-2xl shadow-xl w-[350px] relative">
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 text-slate-500 hover:text-black"
              >
                <X size={22} />
              </button>

              <h3 className="text-lg font-semibold mb-3">
                Scan Document
              </h3>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-[260px] bg-black rounded-lg"
              />

              <canvas ref={canvasRef} className="hidden"></canvas>

              <button
                onClick={captureScan}
                className="mt-4 w-full py-2 bg-sky-600 text-white rounded-lg"
              >
                Capture Scan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientScanDocumentsPage;
