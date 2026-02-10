import React from "react";
import Footer from "./footer";
import { Header } from "./header/header";

interface LayoutProps {
  children: React.ReactNode;
}

export default  function RootLayout({ children }: LayoutProps) {

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-[101]">
        <Header />
      </div>

      {/* Main Content */}
      <main className="min-h-screen">{children}</main>
      <Footer />
    </div>
  );
}
