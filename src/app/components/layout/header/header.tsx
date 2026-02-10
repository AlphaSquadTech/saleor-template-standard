import { cookies } from "next/headers";
import { Suspense } from "react";
import { NavBar } from "./navBar";
import TopBar from "./topBar";

export const Header = async () => {
  const cookieStore = await cookies();
  const initialIsLoggedIn =
    cookieStore.get("isLoggedIn")?.value === "1" || !!cookieStore.get("token");

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
        {/* Contact + Timings Banner */}
        <TopBar />
      </Suspense>
      <NavBar initialIsLoggedIn={initialIsLoggedIn} />
    </header>
  );
};
