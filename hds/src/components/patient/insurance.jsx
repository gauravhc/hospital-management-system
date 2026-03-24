"use client";

import React from "react";
import useLiveCount from "./useLiveCount";
import { PlusCircle } from "lucide-react";

const PatientInsurancePage = () => {
  const activeClaims = useLiveCount("/api/claims/active/count", 30000);

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
          <header className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                Claim Insurance
              </h2>
              <p className="text-slate-600">
                Submit claims, upload documents, and track status.
              </p>
            </div>

            <div className="text-right p-4 bg-white/90 rounded-xl shadow border">
              <div className="text-sm text-slate-500">
                Active Claims
              </div>
              <div className="text-2xl font-bold text-sky-700">
                {activeClaims}
              </div>
            </div>
          </header>

          {/* NEW CLAIM FORM */}
          <section className="bg-white/90 rounded-2xl shadow-xl p-8 border border-white/30">
            <h4 className="font-semibold mb-4 text-xl flex items-center gap-2">
              <PlusCircle size={20} /> New Claim
            </h4>

            <form className="space-y-4">
              <input
                className="p-3 border rounded-xl w-full"
                placeholder="Hospital name"
              />

              <input
                className="p-3 border rounded-xl w-full"
                placeholder="Admission date"
                type="date"
              />

              <textarea
                className="p-3 border rounded-xl w-full"
                placeholder="Claim description"
              />

              <div className="flex items-center gap-3">
                <input type="file" />
                <div className="text-sm text-slate-500">
                  Attach invoices, summaries, prescriptions
                </div>
              </div>

              <div className="flex justify-end">
                <button className="px-5 py-2 bg-sky-600 text-white rounded-xl shadow hover:bg-sky-700 transition">
                  Submit Claim
                </button>
              </div>
            </form>
          </section>

        </div>
      </main>
    </div>
  );
};

export default PatientInsurancePage;
