import Link from "next/link";

export default function PatientLabResultsPage() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <main
        className="px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-5xl mx-auto bg-white/90 border rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Lab Results</h1>
          <p className="text-slate-600 mt-2">
            Your uploaded and processed reports will appear here.
          </p>

          <div className="mt-6 rounded-xl border p-5 bg-white">
            <p className="text-slate-700 font-medium">No reports available yet.</p>
          </div>

          <div className="mt-6">
            <Link href="/patient/lab" className="text-sky-700 font-medium hover:underline">
              Back to Lab
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

