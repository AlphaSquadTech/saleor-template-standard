import { cookies } from "next/headers";
import { Suspense } from "react";
import { NavBar } from "./navBar";
import TopBar from "./topBar";
import { storefrontOverrides } from "@tenant-overrides";

export interface HeaderRendererProps {
  initialIsLoggedIn: boolean;
}

const DefaultHeaderRenderer = ({ initialIsLoggedIn }: HeaderRendererProps) => {
  return (
    <header className="w-full">
      <Suspense
        fallback={
          <div
            className="w-full"
            style={{ backgroundColor: "var(--color-secondary-900)", height: 36 }}
          />
        }
      >
        <TopBar />
      </Suspense>
      <NavBar initialIsLoggedIn={initialIsLoggedIn} />
    </header>
  );
};

export const Header = async () => {
  const cookieStore = await cookies();
  const initialIsLoggedIn =
    cookieStore.get("isLoggedIn")?.value === "1" || !!cookieStore.get("token");

  const HeaderRenderer =
    (storefrontOverrides as any).Header || DefaultHeaderRenderer;

  return <HeaderRenderer initialIsLoggedIn={initialIsLoggedIn} />;
};
