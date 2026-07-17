import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Undertone",
  description: "A place to go anonymous and share your thoughts, freely, without judgment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
