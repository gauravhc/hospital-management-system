"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiPost } from "@/services/api";
import { LAB_TEST_CATEGORIES, LAB_TESTS_FLAT } from "@/data/labTests";

export default function PatientLabOrderPage() {
  const router = useRouter();
  const searchParams = null;

  const [processing, setProcessing] = useState(false);
  const [booked, setBooked] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedTestId = useMemo(() => {
    const raw = searchParams?.get("testId");
    return raw ? String(raw).trim() : null;
  }, [searchParams]);

  const selected = useMemo(() => {
    if (!selectedTestId) return null;
    return LAB_TESTS_FLAT.find((t) => String(t.id) === String(selectedTestId)) || null;
  }, [selectedTestId]);

  useEffect(() => {
    setBooked(false);
    setError("");
    setMessage("");
  }, [selectedTestId]);

  const handleBook = async () => {
    if (!selected) return;

    setProcessing(true);
    setError("");
    setMessage("");
    try {
      const response = await apiPost("/api/patients/lab-tests", {
        test_name: selected.name,
        test_code: selected.id,
        category: selected.category_title,
        price: selected.price,
        notes: notes.trim() || null,
      });
      setBooked(true);
      setMessage(response?.message || "Test booked successfully.");
    } catch (e) {
      setError(e?.message || "Failed to book test");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <main
        className="px-4 sm:px-6 py-6 sm:py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl mx-auto bg-white/90 border rounded-2xl shadow-xl p-4 sm:p-8 max-w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Book Lab Test</h1>
              <p className="text-slate-600 mt-2">Select a test and book it. No payment required.</p>
            </div>
            <Link href="/patient/lab" className="text-sky-700 font-semibold hover:underline">
              Back to Lab
            </Link>
          </div>

          {!selected ? (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">Choose a test</h2>
              <div className="mt-4 space-y-6">
                {LAB_TEST_CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <h3 className="text-base font-extrabold text-slate-900">{cat.title}</h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(cat.tests || []).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => router.push(`/patient/lab/order?testId=${t.id}`)}
                          className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{t.name}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                Turnaround: {t.turnaround || "24–48 hrs"}
                              </div>
                            </div>
                            <div className="font-bold text-slate-900">₹{t.price}</div>
                          </div>
                          <div className="mt-3 text-sm font-semibold text-sky-700">Book →</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
              <section className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Booking summary</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-slate-900">{selected.name}</span>
                    <span className="font-bold">₹{selected.price}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Category</span>
                    <span className="text-slate-700">{selected.category_title}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-sm font-semibold text-slate-800">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    rows={4}
                    placeholder="Any instruction for the lab..."
                  />
                </div>

                {message ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {message}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                  </div>
                ) : null}
              </section>

              <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Confirm</h2>
                <p className="mt-2 text-sm text-slate-600">
                  This will create a lab booking request. Payment is not required.
                </p>

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={processing || booked}
                  className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {booked ? "Booked" : processing ? "Booking..." : "Book Test"}
                </button>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

