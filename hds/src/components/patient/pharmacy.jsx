"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileCheck,
  Clock,
  XCircle,
} from "lucide-react";

const PatientPharmacyPage = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // OPEN CAMERA
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
        return;
      }
      alert("Camera access denied or unavailable.");
    }
  };

  // CAPTURE PHOTO
  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video?.videoWidth) {
      alert("Camera not ready. Try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "camera-photo.jpg", {
        type: "image/jpeg",
      });
      handleFileUpload({ target: { files: [file] } });
    });

    closeCamera();
  };

  // CLOSE CAMERA
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    setShowCamera(false);
  };

  // ASSIGN STREAM TO VIDEO
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => { });
    }
  }, [cameraStream]);

  // CLEANUP CAMERA
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // FILE UPLOAD HANDLER
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const newPrescription = {
      id: Date.now(),
      name: file.name,
      url,
      status: "pending",
      uploadedAt: new Date().toISOString().split("T")[0],
    };

    setPrescriptions((prev) => [newPrescription, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">

      {/* RIGHT main CONTENT */}
      <main
        className="flex-1 px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-5xl mx-auto">

          {/* HEADER */}
          <header className="mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900">
              Pharmacy Orders
            </h1>
            <p className="text-slate-600">
              Upload prescription & track availability.
            </p>
          </header>

          {/* UPLOAD CARD */}
          <div className="bg-white/90 rounded-2xl shadow-xl p-8 mb-10 border">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Upload Doctor Prescription
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold rounded-xl shadow hover:opacity-90 transition"
            >
              <Upload size={20} /> Upload Prescription
            </button>

            <button
              onClick={openCamera}
              className="flex items-center gap-3 px-5 py-3 bg-slate-800 text-white font-semibold rounded-xl shadow hover:opacity-90 transition mt-3"
            >
              📸 Take Photo
            </button>

            <p className="text-xs text-slate-500 mt-2">
              Accepted: PDF, JPG, PNG
            </p>
          </div>

          {/* PRESCRIPTION LIST */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              My Prescription Orders
            </h2>

            {prescriptions.length === 0 ? (
              <div className="bg-white/90 p-10 text-center rounded-2xl border shadow">
                <p className="text-slate-600">
                  No prescriptions uploaded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {prescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white/90 border rounded-2xl shadow p-5 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {p.name}
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Uploaded: {p.uploadedAt}
                      </div>

                      <div className="flex items-center mt-2 gap-2">
                        {p.status === "pending" && (
                          <>
                            <Clock className="text-yellow-600" size={16} />
                            <span className="text-yellow-700 font-medium">
                              Pending Review
                            </span>
                          </>
                        )}

                        {p.status === "available" && (
                          <>
                            <FileCheck className="text-green-600" size={16} />
                            <span className="text-green-700 font-medium">
                              Available
                            </span>
                          </>
                        )}

                        {p.status === "no_stock" && (
                          <>
                            <XCircle className="text-red-600" size={16} />
                            <span className="text-red-700 font-medium">
                              Out of Stock
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <a
                      href={p.url}
                      target="_blank"
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow hover:bg-sky-700 transition"
                    >
                      Preview
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CAMERA MODAL */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Take Photo</h3>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-[320px] h-[240px] bg-black rounded-lg"
            />

            <canvas ref={canvasRef} className="hidden"></canvas>

            <div className="flex justify-between mt-4">
              <button
                onClick={closeCamera}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={capturePhoto}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientPharmacyPage;
