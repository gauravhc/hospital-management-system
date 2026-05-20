import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "Preclinic - Medical & Hospital SaaS",
  description: "Accessible & Reliable Healthcare Simplified",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased text-gray-700 bg-gray-50 overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>
          <Header />
          <main className="min-h-screen w-full max-w-full min-w-0">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
