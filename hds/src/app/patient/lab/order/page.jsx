"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const TESTS = [
  { id: 1, name: "Full Blood Count (FBC)", price: 250 },
  { id: 2, name: "Lipid Profile", price: 450 },
  { id: 3, name: "Thyroid (TSH)", price: 400 },
  { id: 4, name: "Liver Function Test", price: 500 },
  { id: 5, name: "Renal Profile", price: 450 },
  { id: 6, name: "HbA1c", price: 350 },
];

export default function PatientLabOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  const selectedTestId = useMemo(() => {
    const raw = searchParams?.get("testId");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const selected = useMemo(() => {
    if (!selectedTestId) return null;
    return TESTS.find((t) => t.id === selectedTestId) || null;
  }, [selectedTestId]);

  const handlePay = async () => {
    if (!selected) return;

    if (method === "upi" && !upiId.trim()) {
      alert("Enter your UPI ID");
      return;
    }

    if (method === "card" && (!cardNumber.trim() || !nameOnCard.trim())) {
      alert("Enter card details");
      return;
    }

    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      setPaid(true);
    } finally {
      setProcessing(false);
    }
  };

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
        <div className="max-w-4xl mx-auto bg-white/90 border rounded-2xl shadow-xl p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Pay for Lab Test</h1>
              <p className="text-slate-600 mt-2">
                Select a test and complete payment to place your order.
              </p>
            </div>
            <Link href="/patient/lab" className="text-sky-700 font-semibold hover:underline">
              Back to Lab
            </Link>
          </div>

          {!selected ? (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">Choose a test</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TESTS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => router.push(`/patient/lab/order?testId=${t.id}`)}
                    className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="mt-1 text-sm text-slate-500">Turnaround: 24–48 hrs</div>
                      </div>
                      <div className="font-bold text-slate-900">₹{t.price}</div>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-sky-700">Continue to payment →</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
              <section className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-slate-900">{selected.name}</span>
                    <span className="font-bold">₹{selected.price}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Service fee</span>
                    <span className="text-slate-700">₹0</span>
                  </div>
                  <div className="mt-3 border-t pt-3 flex items-center justify-between gap-4">
                    <span className="text-slate-900 font-bold">Total</span>
                    <span className="text-slate-900 font-extrabold">₹{selected.price}</span>
                  </div>
                </div>

                {paid ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Payment successful. Your lab test order is placed.
                  </div>
                ) : null}
              </section>

              <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900">Payment</h2>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="method"
                      value="upi"
                      checked={method === "upi"}
                      onChange={() => setMethod("upi")}
                    />
                    UPI
                  </label>
                  {method === "upi" ? (
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="yourname@upi"
                    />
                  ) : null}

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="method"
                      value="card"
                      checked={method === "card"}
                      onChange={() => setMethod("card")}
                    />
                    Card
                  </label>
                  {method === "card" ? (
                    <div className="space-y-2">
                      <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Card number"
                      />
                      <input
                        value={nameOnCard}
                        onChange={(e) => setNameOnCard(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Name on card"
                      />
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={processing || paid}
                  className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {paid ? "Paid" : processing ? "Processing..." : `Pay ₹${selected.price}`}
                </button>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
