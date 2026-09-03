import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Aletheia.edu — Learn through story",
  description:
    "Turn any curriculum into a black-and-white comic. Read, answer, and understand — with a real correction when you miss the point.",
  openGraph: {
    title: "Aletheia.edu — Learn through story",
    description:
      "Curriculum becomes a comic you finish. Fact-anchored chapters, Socratic checks, real corrections.",
    type: "website",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect fill='%23f7f1e6' width='32' height='32'/><text x='16' y='22' text-anchor='middle' font-size='18' font-family='Georgia,serif' fill='%231c1916'>A</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${cormorant.variable} font-sans bg-cream text-ink antialiased`}
      >
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#f7f1e6",
              color: "#1c1916",
              border: "1px solid #1c191633",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
        <Header />
        <div className="min-h-screen flex flex-col pt-16 sm:pt-20">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
