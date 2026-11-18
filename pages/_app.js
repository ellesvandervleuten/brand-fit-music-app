import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { DM_Sans, Bricolage_Grotesque } from "next/font/google";

// Mise-lettertypes, door Next.js zelf gehost (geen verzoek naar Google bij bezoekers)
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <div className={`${dmSans.variable} ${bricolage.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
