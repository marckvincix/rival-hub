// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        
        {/* Primary Meta Tags */}
        <title>Rival Hub - Crea e Gestisci Tornei Sportivi</title>
        <meta name="title" content="Rival Hub - Crea e Gestisci Tornei Sportivi" />
        <meta name="description" content="Crea e gestisci i tuoi tornei sportivi con facilità. Organizza competizioni di calcio, basket, pallavolo, tennis, padel e rugby. Statistiche in tempo reale, classifiche automatiche e condivisione istantanea." />
        <meta name="keywords" content="tornei sportivi, gestione tornei, calcio, basket, pallavolo, tennis, padel, rugby, organizzazione partite, classifiche, statistiche sport" />
        <meta name="author" content="Rival Hub" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.rivalhub.app" />
        
        {/* Theme Color for browsers */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.rivalhub.app" />
        <meta property="og:title" content="Rival Hub - Crea e Gestisci Tornei Sportivi" />
        <meta property="og:description" content="Crea e gestisci i tuoi tornei sportivi con facilità. Organizza competizioni di calcio, basket, pallavolo, tennis, padel e rugby. Statistiche in tempo reale e condivisione istantanea." />
        <meta property="og:image" content="https://www.rivalhub.app/assets/images/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Rival Hub" />
        <meta property="og:locale" content="it_IT" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.rivalhub.app" />
        <meta name="twitter:title" content="Rival Hub - Crea e Gestisci Tornei Sportivi" />
        <meta name="twitter:description" content="Crea e gestisci i tuoi tornei sportivi con facilità. Organizza competizioni di calcio, basket, pallavolo, tennis, padel e rugby." />
        <meta name="twitter:image" content="https://www.rivalhub.app/assets/images/og-image.png" />
        
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
              
              /* Responsive styles for desktop */
              @media (min-width: 768px) {
                body > div:first-child {
                  max-width: 100%;
                  margin: 0 auto;
                }
              }
              
              /* Hide scrollbar but allow scrolling */
              ::-webkit-scrollbar {
                width: 0px;
                background: transparent;
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000",
        }}
      >
        {children}
      </body>
    </html>
  );
}
