 

import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css"; // global styles import

 
const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});
 
const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

 
export const metadata: Metadata = {
  title: "Wall Calendar",
  description: "Interactive wall calendar with range selection and notes.",
};

 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
