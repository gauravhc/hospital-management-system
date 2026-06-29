import Link from "next/link";
import {
  ArrowRight,
  Baby,
  CalendarCheck,
  Microscope,
  Scissors,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export const metadata = {
  title: "Services | Preclinic",
  description: "Explore healthcare services available through Medicore Vault.",
};

const services = [
  {
    title: "General Medicine",
    description:
      "Primary care consultations, preventive checkups, chronic condition follow-up, and everyday medical support for patients of all ages.",
    icon: Stethoscope,
    color: "bg-blue-500",
  },
  {
    title: "Surgery",
    description:
      "Coordinated surgical care from consultation to follow-up, covering minor procedures and specialist referrals.",
    icon: Scissors,
    color: "bg-green-500",
  },
  {
    title: "Laboratory Services",
    description:
      "Fast diagnostic testing, lab order tracking, and report access to help doctors make timely treatment decisions.",
    icon: Microscope,
    color: "bg-purple-500",
  },
  {
    title: "Pediatrics",
    description:
      "Child-focused care for growth monitoring, vaccinations, illness visits, and family-centered pediatric guidance.",
    icon: Baby,
    color: "bg-orange-500",
  },
  {
    title: "Appointment Management",
    description:
      "Simple booking, schedule tracking, and visit coordination between patients, doctors, nurses, and front desk teams.",
    icon: CalendarCheck,
    color: "bg-cyan-500",
  },
  {
    title: "Insurance Support",
    description:
      "Insurance request tracking and claim workflow support for a smoother billing and approval experience.",
    icon: ShieldCheck,
    color: "bg-rose-500",
  },
];

export default function ServicesPage() {
  return (
    <main className="bg-gray-50 min-h-screen py-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <p className="text-[#0E82FD] font-bold mb-2">OUR SERVICES</p>
            <h1 className="text-4xl font-bold text-[#1B2559] mb-4">Healthcare Services</h1>
            <p className="text-gray-600 max-w-2xl">
              Explore the core services available through Medicore Vault for patients,
              clinicians, and hospital operations teams.
            </p>
          </div>
          <Link
            href="/appointment"
            className="inline-flex items-center justify-center rounded-lg bg-[#0E82FD] px-5 py-3 font-semibold text-white transition hover:bg-[#096edb]"
          >
            Book Appointment <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article
                key={service.title}
                className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`${service.color} mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-md`}
                >
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h2 className="mb-4 text-2xl font-bold text-[#1B2559]">{service.title}</h2>
                <p className="leading-relaxed text-gray-500">{service.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
