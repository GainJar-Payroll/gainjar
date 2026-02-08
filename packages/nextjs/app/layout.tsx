import { IBM_Plex_Mono, IBM_Plex_Serif, Inter } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import Navbar from "~~/components/navbar";
import { RootProvider } from "~~/provider/root-provider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import { Toaster } from "~~/components/ui/sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const ibmSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-ibm-serif",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata = getMetadata({
  title: "GainJar - Decentralized Payroll",
  description: "Stream payments directly to employees on the blockchain with GainJar",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${inter.variable} ${ibmMono.variable} ${ibmSerif.variable}`}>
      <body>
        <RootProvider>
          <Navbar />
          {children}
          <Toaster />
        </RootProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
