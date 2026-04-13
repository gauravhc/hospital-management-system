"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, AlertTriangle, FlaskConical, CheckCircle2 } from "lucide-react";

import { apiGet, apiPost, apiPut, API_URL } from "@/services/api";

const STATUS_OPTIONS = ["scheduled", "completed", "cancelled", "no_show"];

const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const labelClass = "text-xs font-semibold text-slate-500 uppercase";
const valueClass = "mt-1 text-sm font-semibold text-slate-900";
const LAB_TEST_OPTIONS = ["CBC", "Blood Sugar", "KFT", "LFT", "X-Ray Chest", "ECG", "Urine Test", "Thyroid Profile"];

export default function DoctorAppointmentManagePage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = useMemo(() => String(params?.id || "").trim(), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [appointment, setAppointment] = useState(null);
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [labTests, setLabTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [labNotes, setLabNotes] = useState("");
  const [labLoading, setLabLoading] = useState(false);
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [labMessage, setLabMessage] = useState("");
  const [labError, setLabError] = useState("");
  const [medicineCatalog, setMedicineCatalog] = useState([]);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [prescriptionQuantity, setPrescriptionQuantity] = useState("1");
  const [prescriptionDosage, setPrescriptionDosage] = useState("");
  const [prescriptionFrequency, setPrescriptionFrequency] = useState("");
  const [prescriptionDuration, setPrescriptionDuration] = useState("");
  const [prescriptionItemNotes, setPrescriptionItemNotes] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [prescriptionImagePreview, setPrescriptionImagePreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);
  const [prescriptionMessage, setPrescriptionMessage] = useState("");
  const [prescriptionError, setPrescriptionError] = useState("");
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const resolvedAppointmentPatientId = useMemo(
    () => appointment?.patient_id ?? appointment?.patientId ?? "",
    [appointment]
  );
  const resolvedAppointmentDoctorId = useMemo(
    () => appointment?.doctor_id ?? appointment?.doctorId ?? "",
    [appointment]
  );

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "doctor") {
      router.push("/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const res = await apiGet(`/api/appointments/${appointmentId}`);
        const appt = res?.appointment || res?.data || null;
        if (!appt) throw new Error("Appointment not found");
        setAppointment(appt);
        setStatus(String(appt.status || "scheduled").toLowerCase());
        setNotes(appt.notes || appt.remarks || appt.note || "");
        await Promise.all([loadLabTests(), loadMedicineCatalog()]);
      } catch (err) {
        setError(err?.message || "Failed to load appointment.");
        setAppointment(null);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) load();
  }, [appointmentId, router]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      if (prescriptionImagePreview) {
        URL.revokeObjectURL(prescriptionImagePreview);
      }
    };
  }, [prescriptionImagePreview]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) return;

    const video = videoRef.current;
    video.srcObject = cameraStreamRef.current;
    video
      .play()
      .catch(() => {
        setPrescriptionError("Camera opened, but preview could not start. Please allow camera access and try again.");
      });
  }, [cameraOpen]);

  const loadLabTests = async () => {
    if (!appointmentId) return;
    setLabLoading(true);
    setLabError("");
    try {
      const res = await apiGet(`/api/lab/appointment/${appointmentId}`);
      const list = res?.data || [];
      setLabTests(Array.isArray(list) ? list : []);
    } catch (err) {
      setLabTests([]);
      setLabError(err?.message || "Failed to load lab tests.");
    } finally {
      setLabLoading(false);
    }
  };

  const loadMedicineCatalog = async () => {
    setPrescriptionLoading(true);
    setPrescriptionError("");
    try {
      const res = await apiGet("/api/pharmacy/medicines");
      const list = Array.isArray(res?.data) ? res.data : [];
      setMedicineCatalog(list);
    } catch (err) {
      setMedicineCatalog([]);
      setPrescriptionError(err?.message || "Failed to load medicines.");
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const save = async () => {
    if (!appointmentId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = { status };
      if (notes !== undefined) payload.notes = notes;
      const res = await apiPut(`/api/appointments/${appointmentId}`, payload);
      if (!res?.success) throw new Error(res?.message || "Failed to update appointment.");
      setAppointment((current) => (current ? { ...current, status, notes } : current));
      setMessage("Appointment updated.");
    } catch (err) {
      setError(err?.message || "Failed to update appointment.");
    } finally {
      setSaving(false);
    }
  };

  const requestLabTests = async () => {
    if (!appointmentId) return;
    if (!selectedTests.length) {
      setLabError("Select at least one lab test.");
      setLabMessage("");
      return;
    }

    setLabSubmitting(true);
    setLabError("");
    setLabMessage("");
    try {
      const res = await apiPost(`/api/appointments/request-lab-test/${appointmentId}`, {
        tests: selectedTests,
        notes: labNotes || null,
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to request lab tests.");
      }

      setSelectedTests([]);
      setLabNotes("");
      setLabMessage("Lab test request sent to the lab technician desk.");
      await loadLabTests();
    } catch (err) {
      setLabError(err?.message || "Failed to request lab tests.");
    } finally {
      setLabSubmitting(false);
    }
  };

  const openReport = (result) => {
    if (!result) return;
    try {
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (first) {
        window.open(`${API_URL}${first}`, "_blank");
        return;
      }
    } catch {
      // ignore parse failure and fall back
    }
    window.open(`${API_URL}${result}`, "_blank");
  };

  const addPrescriptionItem = () => {
    setPrescriptionError("");
    setPrescriptionMessage("");

    const medicineId = String(selectedMedicineId || "").trim();
    if (!medicineId) {
      setPrescriptionError("Select a medicine first.");
      return;
    }

    const medicine = medicineCatalog.find((entry) => String(entry?.id) === medicineId);
    if (!medicine) {
      setPrescriptionError("Selected medicine is not available.");
      return;
    }

    const quantity = Math.max(1, Number(prescriptionQuantity || 1));

    setPrescriptionItems((current) => [
      ...current,
      {
        medicine_id: medicine.id,
        medicine_name: medicine.name || medicine.medicine_name || `Medicine #${medicine.id}`,
        quantity,
        dosage: prescriptionDosage.trim() || null,
        frequency: prescriptionFrequency.trim() || null,
        duration: prescriptionDuration.trim() || null,
        notes: prescriptionItemNotes.trim() || null,
      },
    ]);

    setSelectedMedicineId("");
    setPrescriptionQuantity("1");
    setPrescriptionDosage("");
    setPrescriptionFrequency("");
    setPrescriptionDuration("");
    setPrescriptionItemNotes("");
  };

  const removePrescriptionItem = (indexToRemove) => {
    setPrescriptionItems((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const savePrescription = async () => {
    if (!appointment) return;
    if (!resolvedAppointmentPatientId) {
      setPrescriptionError("Patient information is missing on this appointment.");
      setPrescriptionMessage("");
      return;
    }

    if (!prescriptionItems.length) {
      setPrescriptionError("Add at least one medicine before sending to pharmacy.");
      setPrescriptionMessage("");
      return;
    }

    setPrescriptionSubmitting(true);
    setPrescriptionError("");
    setPrescriptionMessage("");

    try {
      const formData = new FormData();
      formData.append("patient_id", String(resolvedAppointmentPatientId));
      formData.append("doctor_id", String(resolvedAppointmentDoctorId || ""));
      formData.append("notes", prescriptionNotes.trim() || "");
      formData.append("items", JSON.stringify(prescriptionItems));
      if (prescriptionImage) {
        formData.append("prescription_image", prescriptionImage);
      }

      const res = await apiPost("/api/pharmacy/prescriptions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to save prescription.");
      }

      setPrescriptionItems([]);
      setPrescriptionNotes("");
      setPrescriptionImage(null);
      setPrescriptionImagePreview("");
      setPrescriptionMessage("Prescription sent to pharmacy successfully.");
    } catch (err) {
      setPrescriptionError(err?.message || "Failed to save prescription.");
    } finally {
      setPrescriptionSubmitting(false);
    }
  };

  const handlePrescriptionImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraOpen(false);
    }
    if (prescriptionImagePreview) {
      URL.revokeObjectURL(prescriptionImagePreview);
    }
    setPrescriptionImage(file);
    setPrescriptionImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const startCamera = async () => {
    setPrescriptionError("");
    setPrescriptionMessage("");
    setCameraStarting(true);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setPrescriptionError("Unable to open camera. You can allow camera access or use the mobile camera capture option.");
      setCameraOpen(false);
    } finally {
      setCameraStarting(false);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraOpen(false);
  };

  const capturePrescriptionPhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setPrescriptionError("Unable to capture the photo right now.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setPrescriptionError("Unable to capture the photo right now.");
        return;
      }

      const file = new File([blob], `prescription-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (prescriptionImagePreview) {
        URL.revokeObjectURL(prescriptionImagePreview);
      }
      setPrescriptionImage(file);
      setPrescriptionImagePreview(URL.createObjectURL(file));
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/doctor"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manage Appointment</h1>
              <p className="text-sm text-slate-500">Appointment ID: {appointmentId}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !appointment}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${cardClass} flex items-center gap-3 text-slate-600`}>
            <Loader2 className="animate-spin" size={18} />
            Loading appointment...
          </div>
        ) : !appointment ? (
          <div className={`${cardClass} flex items-center gap-3 text-slate-700`}>
            <AlertTriangle size={18} className="text-amber-600" />
            Appointment not available.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className={`${cardClass} lg:col-span-2`}>
              <h2 className="text-lg font-bold text-slate-900">Details</h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <p className={labelClass}>Patient</p>
                  <p className={valueClass}>{appointment.patientName || appointment.patient_name || appointment.patient_id || "--"}</p>
                </div>
                <div>
                  <p className={labelClass}>Doctor</p>
                  <p className={valueClass}>{appointment.doctorName || appointment.doctor_name || appointment.doctor_id || "--"}</p>
                </div>
                <div>
                  <p className={labelClass}>Date</p>
                  <p className={valueClass}>{appointment.date || appointment.appointment_date || "--"}</p>
                </div>
                <div>
                  <p className={labelClass}>Time</p>
                  <p className={valueClass}>{appointment.time || appointment.appointment_time || "--"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className={labelClass}>Symptoms</p>
                  <p className="mt-1 text-sm text-slate-700">{appointment.symptoms || "--"}</p>
                </div>
              </div>
              </div>

              <div className={cardClass}>
                <h2 className="text-lg font-bold text-slate-900">Actions</h2>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={5}
                      className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="Add remarks for this appointment..."
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 text-slate-500" />
                      <p>Changes here update the appointment record. If you don&apos;t use notes in your schema, they will be ignored.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardClass} space-y-6`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lab Request Workflow</h2>
                  <p className="mt-1 text-sm text-slate-500">Request tests for this appointment and monitor what has already been sent to the lab desk.</p>
                </div>
                <FlaskConical className="text-blue-600" size={20} />
              </div>

              {labMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {labMessage}
                </div>
              ) : null}
              {labError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {labError}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Select lab tests</label>
                    <select
                      multiple
                      value={selectedTests}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions).map((option) => option.value);
                        setSelectedTests(values);
                      }}
                      className="mt-1 min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      {LAB_TEST_OPTIONS.map((test) => (
                        <option key={test} value={test}>
                          {test}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">Hold Ctrl or Cmd to choose multiple tests.</p>
                  </div>

                  <div>
                    <label className={labelClass}>Lab notes</label>
                    <textarea
                      value={labNotes}
                      onChange={(e) => setLabNotes(e.target.value)}
                      rows={5}
                      className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="Add sample instructions or notes for the technician..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={requestLabTests}
                    disabled={labSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {labSubmitting ? <Loader2 className="animate-spin" size={16} /> : <FlaskConical size={16} />}
                    {labSubmitting ? "Sending..." : "Send Lab Request"}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Requested lab tests</p>
                      <p className="mt-1 text-sm text-slate-500">These are the tests already linked to this appointment.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {labLoading ? "Loading..." : `${labTests.length} item(s)`}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {labLoading ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        Loading lab requests...
                      </div>
                    ) : labTests.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                        No lab tests requested yet for this appointment.
                      </div>
                    ) : (
                      labTests.map((test) => (
                        <div key={test.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{test.testName || test.test_name || "Lab Test"}</p>
                              {test.notes ? <p className="mt-1 text-sm text-slate-500">{test.notes}</p> : null}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                String(test.status || "").toLowerCase() === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {String(test.status || "").toLowerCase() === "completed" ? <CheckCircle2 size={12} /> : <FlaskConical size={12} />}
                              {test.status || "pending"}
                            </span>
                          </div>

                          {test.result ? (
                            <button
                              type="button"
                              onClick={() => openReport(test.result)}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                              Open Report
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardClass} space-y-6`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Pharmacy Prescription</h2>
                  <p className="mt-1 text-sm text-slate-500">Add medicines here and send the prescription to the pharmacist so it can be imported on the dispense page.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadMedicineCatalog}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Refresh Medicines
                  </button>
                  <Link
                    href="/pharmacy/stock"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Open Stock
                  </Link>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {prescriptionLoading ? "Loading..." : `${medicineCatalog.length} medicine(s)`}
                  </span>
                </div>
              </div>

              {prescriptionMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {prescriptionMessage}
                </div>
              ) : null}
              {prescriptionError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {prescriptionError}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                      <span>Medicine</span>
                      <select
                        value={selectedMedicineId}
                        onChange={(e) => setSelectedMedicineId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Select medicine</option>
                        {medicineCatalog.map((medicine) => (
                          <option key={medicine.id} value={medicine.id}>
                            {medicine.name || medicine.medicine_name || "Medicine"} ({medicine.sku || medicine.batchNumber || `#${medicine.id}`})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={prescriptionQuantity}
                        onChange={(e) => setPrescriptionQuantity(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>Dosage</span>
                      <input
                        type="text"
                        value={prescriptionDosage}
                        onChange={(e) => setPrescriptionDosage(e.target.value)}
                        placeholder="e.g. 1 tablet"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>Frequency</span>
                      <input
                        type="text"
                        value={prescriptionFrequency}
                        onChange={(e) => setPrescriptionFrequency(e.target.value)}
                        placeholder="e.g. Twice daily"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      <span>Duration</span>
                      <input
                        type="text"
                        value={prescriptionDuration}
                        onChange={(e) => setPrescriptionDuration(e.target.value)}
                        placeholder="e.g. 5 days"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                      <span>Medicine notes</span>
                      <textarea
                        value={prescriptionItemNotes}
                        onChange={(e) => setPrescriptionItemNotes(e.target.value)}
                        rows={3}
                        placeholder="Extra instructions for this medicine..."
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={addPrescriptionItem}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    Add Medicine
                  </button>

                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    <span>Prescription notes</span>
                    <textarea
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      rows={4}
                      placeholder="Overall notes for the pharmacist..."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-slate-700">Prescription photo</span>
                      <p className="mt-1 text-xs text-slate-500">Take the prescription photo directly and send it to the pharmacist with this prescription.</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={cameraStarting}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cameraStarting ? "Opening camera..." : "Take Photo"}
                      </button>

                      <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Use Device Camera
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePrescriptionImageChange}
                          className="hidden"
                        />
                      </label>

                      {prescriptionImage ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (prescriptionImagePreview) {
                              URL.revokeObjectURL(prescriptionImagePreview);
                            }
                            setPrescriptionImage(null);
                            setPrescriptionImagePreview("");
                          }}
                          className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Remove Photo
                        </button>
                      ) : null}
                    </div>

                    {cameraOpen ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full rounded-2xl bg-slate-950"
                        />
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={capturePrescriptionPhoto}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Capture Photo
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {prescriptionImagePreview ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Image preview</p>
                      <img
                        src={prescriptionImagePreview}
                        alt="Prescription preview"
                        className="mt-3 max-h-64 w-full rounded-2xl object-contain"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Prescription items</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {prescriptionItems.length} item(s)
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {prescriptionItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                          No medicines added yet.
                        </div>
                      ) : (
                        prescriptionItems.map((item, index) => (
                          <div key={`${item.medicine_id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{item.medicine_name}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  Qty: {item.quantity}
                                  {item.dosage ? ` · ${item.dosage}` : ""}
                                  {item.frequency ? ` · ${item.frequency}` : ""}
                                  {item.duration ? ` · ${item.duration}` : ""}
                                </p>
                                {item.notes ? <p className="mt-1 text-sm text-slate-500">{item.notes}</p> : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => removePrescriptionItem(index)}
                                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={savePrescription}
                    disabled={prescriptionSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prescriptionSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {prescriptionSubmitting ? "Sending..." : "Send to Pharmacy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
