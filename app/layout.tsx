import type { Metadata } from "next";
import "./globals.css";
import { PageLoader } from "@/components/page-loader";

export const metadata: Metadata = {
  title: "stringweave — String Art",
  description: "Convert images to string art nail sequences",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="stylesheet" href="https://crubio.fyi/crubio-ui/app/tokens.css" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
