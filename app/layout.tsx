import type { Metadata } from "next";
import "./globals.css";
import { DeferredStylesheet } from "@/components/deferred-stylesheet";
import { PageLoader } from "@/components/page-loader";

export const metadata: Metadata = {
  title: "StringWeave — Art Generator",
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
        <link rel="preconnect" href="https://crubio.fyi" />
        <link
          rel="preconnect"
          href="https://cdnjs.cloudflare.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://crubio.fyi/crubio-ui/app/tokens.css"
        />
        {/* Font Awesome loaded non-blocking: icons hide behind PageLoader anyway, so deferring costs nothing visible. */}
        <DeferredStylesheet href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          />
        </noscript>
      </head>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
