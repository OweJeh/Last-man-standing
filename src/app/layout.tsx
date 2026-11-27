import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { SplashWrapper } from "@/components/brand/splash-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LAST MAN STANDING | Live Elimination Raffle",
    template: "%s | LAST MAN STANDING",
  },
  description:
    "Choose your number. Enter the competition. Watch the grid. Survive every elimination.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple:    "/favicon.svg",
  },
  openGraph: {
    title: "LAST MAN STANDING | Live Elimination Raffle",
    description:
      "One Number. One Chance. Last Man Standing. Cryptographically verifiable grid elimination competition.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${playfair.variable} dark`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!sessionStorage.getItem('lms-splash-shown')){document.documentElement.classList.add('lms-splash-pending')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#080808] text-white antialiased selection:bg-[#EF3038] selection:text-white">
        <ToastProvider>
          <SplashWrapper />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

