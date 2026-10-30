import type { Metadata, Viewport } from "next";
import { Inter, Limelight } from "next/font/google";
import "./globals.css";

const limelight = Limelight({ weight: "400", subsets: ["latin"], variable: "--font-limelight" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Marqi", template: "%s · Marqi" },
  description: "Your personal picture palace for Prime Video, JioHotstar and Apple TV in India.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0f0d0b", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${limelight.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
