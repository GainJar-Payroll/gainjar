import Link from "next/link";
import { RainbowKitConnectButton } from "./rainbow-kit-connect-button";
import { cn } from "~~/lib/utils";

export default function Navbar() {
  return (
    <nav className={cn("sticky z-[1] top-0 backdrop-blur-sm transition-colors duration-200 bg-background")}>
      <div className="px-2 py-4 flex justify-between max-w-7xl mx-auto items-center">
        <Link href="/" className="font-heading font-bold">
          Gainjar
        </Link>
        <div className="flex justify-center items-center gap-4 font-mono uppercase text-xs">
          <Link href={"/dashboard"} className="hover:underline">
            Dashboard
          </Link>
          <RainbowKitConnectButton />
        </div>
      </div>
    </nav>
  );
}
