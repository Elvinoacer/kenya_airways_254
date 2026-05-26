import "./globals.css";
import PublicShell from "./components/PublicShell";

export const metadata = {
  title: "Kenya Airways – The Pride of Africa",
  description: "Exclusive Flight Savings with Mastercard. Discover the world with Kenya Airways.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Hanken Grotesk Font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols Outlined */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
