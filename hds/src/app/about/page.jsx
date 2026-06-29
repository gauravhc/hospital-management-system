import Link from "next/link";
import { CheckCircle, HeartPulse, ShieldCheck, Users } from "lucide-react";

export const metadata = {
  title: "About | Preclinic",
  description: "Learn more about Medicore Vault healthcare services.",
};

const highlights = [
  {
    title: "Connected Care",
    description: "Patients, doctors, nurses, and hospital teams work from one coordinated platform.",
    icon: HeartPulse,
  },
  {
    title: "Reliable Operations",
    description: "Appointments, records, billing, lab reports, pharmacy, and inventory stay easy to track.",
    icon: ShieldCheck,
  },
  {
    title: "Patient First",
    description: "Every workflow is built to make healthcare access clearer, faster, and less stressful.",
    icon: Users,
  },
];

const features = [
  "Routine check-ups",
  "Specialist consultations",
  "Laboratory coordination",
  "Digital patient records",
  "Insurance and billing support",
  "Pharmacy and inventory workflows",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white py-20">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-2 font-bold text-[#0E82FD]">ABOUT US</p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-[#1B2559] md:text-5xl">
              Accessible and reliable healthcare, simplified
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              Medicore Vault brings essential hospital workflows into one place,
              helping care teams manage appointments, records, diagnostics, billing,
              pharmacy, and daily operations with confidence.
            </p>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-[#0E82FD]" />
                  <span className="font-medium text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/appointment"
                className="inline-flex items-center justify-center rounded-xl bg-[#0E82FD] px-8 py-3 font-bold text-white shadow-lg transition hover:bg-blue-700"
              >
                Book Appointment
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex items-center justify-center rounded-xl border border-[#1B2559] px-8 py-3 font-bold text-[#1B2559] transition hover:bg-[#1B2559] hover:text-white"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <div className="grid gap-5">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0E82FD] text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-[#1B2559]">{item.title}</h2>
                  <p className="leading-relaxed text-gray-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
