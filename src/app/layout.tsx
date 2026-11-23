import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magazine Studio",
  description: "Create, preview and print your township's annual magazine.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
