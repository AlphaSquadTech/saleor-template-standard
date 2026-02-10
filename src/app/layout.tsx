import Layout from "@/app/components/layout/rootLayout";
import { ThemeProvider } from "@/app/components/theme/theme-provider";
import { Theme } from "@/app/utils/functions";
import ConditionalGoogleAnalytics from "./components/analytics/ConditionalGoogleAnalytics";
import ConditionalGTMNoscript from "./components/analytics/ConditionalGTMNoscript";
import type { Metadata } from "next";
import { Archivo, Days_One } from "next/font/google";
import type React from "react";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/pagination";
import AnalyticsScripts from "./components/analytics/AnalyticsScripts";
import { TokenExpirationHandler } from "./components/auth/TokenExpirationHandler";
import ApolloWrapper from "./components/providers/ApolloWrapper";
import GoogleTagManagerProvider from "./components/providers/GoogleTagManagerProvider";
import { ServerAppConfigurationProvider } from "./components/providers/ServerAppConfigurationProvider";
import { getClientSafeConfiguration } from "./utils/serverConfigurationService";
import RecaptchaProvider from "./components/providers/RecaptchaProvider";
import "./globals.css";
import GoogleAnalyticsProvider from "./components/providers/GoogleAnalyticsProvider";
import { getStoreName } from "./utils/branding";
import YMMStatusProvider from "./components/providers/YMMStatusProvider";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const daysOne = Days_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-days-one",
});

const appIcon = "/favicon.ico";

export const metadata: Metadata = {
  title: getStoreName(),
  description:
    "Your premier online destination for quality products with fast shipping and exceptional service",
  icons: {
    icon: [
      {
        url: appIcon,
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: appIcon,
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const envTheme = "baja-kits";

  // Fetch configuration on server side
  const configuration = await getClientSafeConfiguration();

  return (
    <html lang="en" className={`${archivo.variable} ${daysOne.variable}`}>
      <head>
        {configuration?.google?.search_console_verification_content && (
          <meta
            name="google-site-verification"
            content={configuration.google.search_console_verification_content}
          />
        )}
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ApolloWrapper>
          <ServerAppConfigurationProvider configuration={configuration}>
            <ConditionalGTMNoscript />
            <ThemeProvider defaultTheme={envTheme as Theme}>
              <RecaptchaProvider>
                <AnalyticsScripts />
                <GoogleAnalyticsProvider>
                  <GoogleTagManagerProvider>
                    <YMMStatusProvider />
                    <TokenExpirationHandler />
                    <Layout>{children}</Layout>
                  </GoogleTagManagerProvider>
                </GoogleAnalyticsProvider>
              </RecaptchaProvider>
            </ThemeProvider>
            <ConditionalGoogleAnalytics />
          </ServerAppConfigurationProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
