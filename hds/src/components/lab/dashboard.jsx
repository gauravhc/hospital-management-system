"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";
import backendUrl from "@/lib/backendUrl";
import {
  TestTube,
  Microscope,
  FileText,
  UploadCloud,
  LogOut,
  User,
  Search,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

export default function LabPage() {
  const router = useRouter();

  const [username, setUsername] = useState("Lab Tech");
  const [greeting, setGreeting] = useState("Welcome");
  const [isDark, setIsDark] = useState(false);
  const [avatar, setAvatar] = useState("");

  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openTest, setOpenTest] = useState(null);
  const [file, setFile] = useState([]);
  const [comment, setComment] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Init
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const user = localStorage.getItem("username");

    if (!token || role !== "lab") {
      router.push("/login");
      return;
    }
    setUsername(user || "Lab Tech");

    // Greeting
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening");

    // Theme
    const stored = localStorage.getItem("theme_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored === "dark" || (!stored && prefersDark));

    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/lab");
      const list = data.data || [];
      setTests(list);
      setFilteredTests(list);
    } catch (err) {
      console.error("Fetch tests error:", err);
      setTests([]);
      setFilteredTests([]);
    } finally {
      setLoading(false);
    }
  };

  // Search & Filter
  const applyFilters = (allTests, searchVal, statusVal) => {
    let result = [...allTests];
    const q = searchVal.trim().toLowerCase();

    if (q) {
      result = result.filter(
        (t) =>
          (t.patientName || "").toLowerCase().includes(q) ||
          t.patient_id?.toLowerCase().includes(q) ||
          (t.testName || "").toLowerCase().includes(q) ||
          t.status?.toLowerCase().includes(q)
      );
    }

    if (statusVal !== "all") {
      result = result.filter(t => (t.status || "").toLowerCase() === statusVal.toLowerCase());
    }

    setFilteredTests(result);
  };

  const handleSearchChange = (v) => {
    setSearch(v);
    applyFilters(tests, v, statusFilter);
  };

  const handleStatusFilter = (v) => {
    setStatusFilter(v);
    applyFilters(tests, search, v);
  };

  const openFor = (test) => {
    setOpenTest(test);
    setComment(test.comments || "");
    setFile([]);
  };

  const handleUpload = async () => {
    if (!openTest) return alert("No test selected");
    if ((!file || file.length === 0) && !comment) return alert("Provide a PDF file or a comment");

    const token = localStorage.getItem("token");
    const form = new FormData();
    if (file && file.length > 0) {
      file.forEach((f) => form.append("reports", f));
    }
    if (comment) form.append("comment", comment);

    try {
      // apiPost with isForm = true
      // Note: Endpoint expects POST for update
      const res = await apiPost(
        `/api/lab/update-result/${openTest.id}`,
        form,
        token,
        true // isForm
      );

      if (res && (res.success || res.status === 200 || res.status === 201)) {
        alert("Report uploaded successfully");
        await fetchTests();

        // Update local selected test to show updated state immediately?
        // Ideally fetchTests refreshes list, but we should clear selection or re-select.
        setOpenTest(null);
        setFile([]);
        setComment("");
      } else {
        alert(res.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error uploading report");
    }
  };



  const downloadReport = (url) => {
    // If external URL or full path logic needed
    const finalUrl = backendUrl(url);
    window.open(finalUrl, '_blank');
  };

  // Stats
  const totalTests = tests.length;
  const pendingCount = tests.filter(t => (t.status || "").toLowerCase() === "pending").length;
  const completedCount = tests.filter(t => (t.status || "").toLowerCase() === "completed").length;

  const renderStatusPill = (status) => {
    const s = (status || "pending").toLowerCase();
    let colorClass, icon;

    if (s === "completed") {
      colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      icon = <CheckCircle size={12} className="mr-1" />;
    } else if (s === "in-progress") {
      colorClass = "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
      icon = <Clock size={12} className="mr-1" />;
    } else {
      colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      icon = <AlertCircle size={12} className="mr-1" />;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </span>
    );
  };

  return (
    <div className={`${isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"} min-h-screen flex flex-col`}>

      <main
        className="flex-1 px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between mb-6 border border-white/20 gap-4 md:gap-0">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 w-full md:w-auto text-center sm:text-left">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner border border-slate-100">
              <Microscope className="w-8 h-8 md:w-10 md:h-10 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lab Dashboard</p>
              <h2 className="text-xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
                {greeting}, <span className="text-violet-500">{username}</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Manage test requests & reports
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto md:justify-end">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-50 transition shadow-sm">
              <User size={18} /> Profile
            </button>

          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/40 dark:to-violet-800/20 p-6 rounded-2xl border border-violet-100 dark:border-violet-800 shadow-sm">
            <div className="relative z-10">
              <p className="text-violet-600 dark:text-violet-300 font-medium text-sm">Total Tests</p>
              <h3 className="text-3xl font-extrabold text-violet-900 dark:text-white mt-1">{totalTests}</h3>
            </div>
            <TestTube className="absolute right-4 bottom-4 text-violet-200 dark:text-violet-800/50 w-16 h-16" />
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800 shadow-sm">
            <div className="relative z-10">
              <p className="text-amber-600 dark:text-amber-300 font-medium text-sm">Pending</p>
              <h3 className="text-3xl font-extrabold text-amber-900 dark:text-white mt-1">{pendingCount}</h3>
            </div>
            <AlertCircle className="absolute right-4 bottom-4 text-amber-200 dark:text-amber-800/50 w-16 h-16" />
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
            <div className="relative z-10">
              <p className="text-emerald-600 dark:text-emerald-300 font-medium text-sm">Completed</p>
              <h3 className="text-3xl font-extrabold text-emerald-900 dark:text-white mt-1">{completedCount}</h3>
            </div>
            <CheckCircle className="absolute right-4 bottom-4 text-emerald-200 dark:text-emerald-800/50 w-16 h-16" />
          </div>
        </div>

        {/* MAIN LAYOUT: List Left, Detail Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Test List */}
          <div className="col-span-1 lg:col-span-7 bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                <TestTube className="text-violet-500" size={20} /> Tests List
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search tests..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredTests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  <Microscope size={40} className="mb-2 opacity-50" />
                  <p>No tests found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTests.map(t => {
                    const isActive = openTest && openTest.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => openFor(t)}
                        className={`
                                  group flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                                  ${isActive
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                            : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-violet-200 dark:hover:border-violet-800"
                          }
                               `}
                      >
                        <div className={`p-2 rounded-full ${isActive ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                          <TestTube size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className={`text-sm font-bold ${isActive ? 'text-violet-900 dark:text-violet-100' : 'text-slate-800 dark:text-slate-200'}`}>
                              {t.testName}
                            </h4>
                            {renderStatusPill(t.status)}
                          </div>
                          <div className="mt-1 flex justify-between items-center">
                            <p className="text-xs text-slate-500">Patient: <span className="font-medium">{t.patientName}</span></p>
                            <span className="text-[10px] text-slate-400">{t.patient_id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Detail View */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 h-full flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <FileText className="text-sky-500" size={20} />
                {openTest ? "Test Details & Report" : "Select a Test"}
              </h3>

              {!openTest ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm opacity-60">
                  <UploadCloud size={60} strokeWidth={1} className="mb-4" />
                  <p>Select a test to upload reports</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Details */}
                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-slate-500 uppercase">Patient</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate">{openTest.patientName}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-slate-500 uppercase">Referring Dr</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm truncate">{openTest.doctorName}</p>
                      </div>
                    </div>

                    {openTest.result && (
                      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase">Existing Report</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400">Available for download</p>
                        </div>
                        <button
                          onClick={() => downloadReport(openTest.result)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition shadow-sm"
                        >
                          Download
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload Form */}
                  <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <UploadCloud size={16} /> Upload New Report
                    </h4>
                    <div className="space-y-3">
                      <label className="block w-full cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="application/pdf"
                          onChange={(e) => setFile(Array.from(e.target.files || []))}
                          className="hidden"
                        />
                        <div className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-violet-300 transition text-center">
                          {file.length > 0 ? (
                            <p className="text-sm text-violet-600 font-medium">{file.length} <span className="text-slate-500 font-normal">file(s) selected</span></p>
                          ) : (
                            <p className="text-sm text-slate-500">Click to select PDF files</p>
                          )}
                        </div>
                      </label>

                      <textarea
                        placeholder="Report comments..."
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition resize-none"
                      ></textarea>

                      <button
                        onClick={handleUpload}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-200 dark:shadow-violet-900/20 font-medium transition"
                      >
                        Upload & Complete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
