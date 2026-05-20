"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Upload, Trash2, ExternalLink } from "lucide-react";

import { apiDelete, apiGet, apiPost } from "@/services/api";
import backendUrl from "@/lib/backendUrl";

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    try {
      const response = await apiGet("/api/patient/documents");
      const list = Array.isArray(response?.documents) ? response.documents : Array.isArray(response?.data) ? response.data : [];
      setDocuments(list);
    } catch (loadError) {
      console.error("PATIENT DOCUMENTS LOAD ERROR:", loadError);
      setError(loadError?.message || "Failed to load documents");
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiPost("/api/patient/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to upload document");
      }

      setMessage("Document uploaded successfully.");
      await loadDocuments();
    } catch (uploadError) {
      setError(uploadError?.message || "Failed to upload document");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (doc) => {
    const docId = doc?.id;
    if (!docId) return;

    const name = doc?.original_name || doc?.title || "this document";
    const ok = window.confirm(`Delete ${name}?`);
    if (!ok) return;

    setMessage("");
    setError("");

    try {
      const response = await apiDelete(`/api/patient/documents/${docId}`);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to delete document");
      }
      setMessage("Document deleted.");
      await loadDocuments();
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete document");
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-700 p-4 sm:p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Medical Documents</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Upload prescriptions, reports, discharge summaries, and other medical files.
        </p>
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

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Document</h2>
            <p className="mt-1 text-sm text-slate-500">PDF, JPG, PNG, and WEBP files are supported.</p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "Upload Document"}
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.length ? (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <FileText size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {doc.original_name || doc.title || "Document"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {doc.file_type ? doc.file_type : doc.mime_type ? doc.mime_type : ""}
                    {doc.file_size
                      ? `${doc.file_type || doc.mime_type ? " • " : ""}${Math.max(1, Math.round(doc.file_size / 1024))} KB`
                      : !doc.file_type && !doc.mime_type
                      ? "Uploaded"
                      : ""}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => {
                      const rawUrl =
                        doc.url ||
                        doc.file_url ||
                        doc.file_path ||
                        doc.path ||
                        "";
                      const viewUrl = rawUrl ? backendUrl(rawUrl) : "";
                      return (
                    <a
                      href={viewUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        viewUrl
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "cursor-not-allowed bg-slate-200 text-slate-500"
                      }`}
                      onClick={(e) => {
                        if (!viewUrl) e.preventDefault();
                      }}
                    >
                      <ExternalLink size={14} />
                      View
                    </a>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            No documents uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}
