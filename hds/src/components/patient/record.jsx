"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Search,
  X,
  CalendarDays,
  FileDown,
} from "lucide-react";

const PatientRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [previewFile, setPreviewFile] = useState(null);

  const fileInputRef = useRef(null);

  const categories = [
    "All",
    "Lab Report",
    "Prescription",
    "Radiology",
    "Discharge Summary",
    "Other",
  ];

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newRecord = {
      id: Date.now(),
      title: file.name,
      category: categoryFilter === "All" ? "Other" : categoryFilter,
      date: new Date().toISOString().split("T")[0],
      url: URL.createObjectURL(file),
      file,
    };

    setRecords((prev) => [newRecord, ...prev]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (record) => {
    if (!record) return;
    if (record.url) {
      URL.revokeObjectURL(record.url);
    }
    setRecords((prev) => prev.filter((item) => item.id !== record.id));
    if (previewFile?.id === record.id) {
      setPreviewFile(null);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "All" || r.category === categoryFilter;

    return matchSearch && matchCategory;
  });

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
        <div className="max-w-6xl mx-auto">

          {/* HEADER */}
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900">
              Health Records
            </h1>
            <p className="text-slate-600">
              Securely upload, store and view your medical records.
            </p>
          </header>

          {/* UPLOAD CARD */}
          <div className="bg-white/90 border p-6 rounded-2xl shadow-xl mb-8">
            <h3 className="font-semibold text-lg mb-3">
              Upload New Record
            </h3>

            <div className="mb-3 flex gap-3 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-full border transition ${categoryFilter === cat
                      ? "bg-sky-600 text-white"
                      : "bg-white text-slate-600 border-slate-300"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <input
              type="file"
              accept=".pdf,image/*"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-xl shadow hover:opacity-90 transition"
            >
              <Upload size={20} /> Upload Record
            </button>

            <p className="text-xs text-slate-500 mt-2">
              Supported: PDF, JPG, PNG, Scans, Medical Docs
            </p>
          </div>

          {/* SEARCH */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center bg-white rounded-xl shadow px-3 py-2 w-full">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-2 w-full outline-none text-slate-700"
              />
            </div>
          </div>

          {/* RECORDS LIST */}
          <section className="space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="bg-white/90 p-10 text-center rounded-2xl shadow">
                <FileText size={40} className="mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600">No records found.</p>
              </div>
            ) : (
              filteredRecords.map((r) => (
                <div
                  key={r.id}
                  className="bg-white/90 border rounded-2xl shadow p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center">
                      <FileText size={20} />
                    </div>

                    <div>
                      <div className="font-semibold text-slate-800">
                        {r.title}
                      </div>
                      <div className="text-xs text-slate-500 flex gap-4">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={14} /> {r.date}
                        </span>
                        <span className="text-sky-600 font-medium">
                          {r.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewFile(r)}
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg shadow hover:bg-sky-700 transition"
                    >
                      View
                    </button>

                    <a
                      download={r.title}
                      href={r.url}
                      className="px-4 py-2 bg-white border rounded-lg shadow flex items-center gap-2"
                    >
                      <FileDown size={18} /> Download
                    </a>

                    <button
                      onClick={() => handleDelete(r)}
                      className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg shadow hover:bg-rose-100 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* PREVIEW MODAL */}
        {previewFile && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-5 max-w-3xl w-full shadow-xl relative">
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute right-5 top-5 text-slate-600 hover:text-black"
              >
                <X size={22} />
              </button>

              <h3 className="text-xl font-bold mb-4">
                {previewFile.title}
              </h3>

              {previewFile.file.type === "application/pdf" ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[500px] rounded-lg border"
                />
              ) : (
                <img
                  src={previewFile.url}
                  className="max-h-[500px] mx-auto rounded-lg shadow"
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientRecordsPage;
