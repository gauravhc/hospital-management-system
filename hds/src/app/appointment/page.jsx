"use client";

import AppointmentForm from "@/components/home/AppointmentForm";

export default function AppointmentPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,130,253,0.18),_transparent_55%),radial-gradient(circle_at_10%_20%,_rgba(16,185,129,0.18),_transparent_45%),radial-gradient(circle_at_90%_10%,_rgba(251,191,36,0.25),_transparent_45%)] px-4 py-12">
      <div className="relative mx-auto max-w-6xl">
        <div className="absolute -top-8 right-6 hidden h-40 w-40 rounded-full bg-amber-300/30 blur-3xl md:block" />
        <div className="absolute -bottom-10 left-10 hidden h-40 w-40 rounded-full bg-sky-400/30 blur-3xl md:block" />

        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-10 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.25),_transparent_45%)]" />
            <div className="relative z-10 space-y-4">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-widest">
                Instant Booking
              </p>
              <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
                Book your appointment with confidence.
              </h1>
              <p className="max-w-md text-sm text-slate-200">
                Choose your hospital, department, and doctor. We will take care of the rest with real-time availability.
              </p>
              <div className="grid gap-4 pt-6 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  Priority slots for registered patients
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  Real-time doctor availability updates
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  Secure booking with instant confirmation
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <AppointmentForm />
          </div>
        </div>
      </div>
    </div>
  );
}
