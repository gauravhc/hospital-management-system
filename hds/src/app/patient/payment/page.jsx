import Link from "next/link";
import { CheckCircle, CreditCard } from "lucide-react";

export default async function PatientPaymentPage({ searchParams }) {
  const params = await searchParams;
  const appointmentId = params?.appointmentId;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <CreditCard className="h-7 w-7" />
        </div>

        <h1 className="mb-3 text-3xl font-bold text-slate-900">Payment Details</h1>
        <p className="mb-6 leading-relaxed text-slate-600">
          Your appointment has been created. Complete payment at the hospital billing
          desk or continue tracking the appointment from your dashboard.
        </p>

        <div className="mb-8 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-3 text-slate-700">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold">
              Appointment ID: {appointmentId || "Not available"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/patient/appointments"
            className="inline-flex justify-center rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700"
          >
            View Appointments
          </Link>
          <Link
            href="/patient"
            className="inline-flex justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
