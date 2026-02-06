import Link from "next/link";
import { RainbowKitConnectButton } from "./rainbow-kit-connect-button";

export default function Navbar() {
  return (
    <nav className="p-4 flex justify-between w-full mx-auto items-center sticky top-0 backdrop-blur-sm bg-background/10 z-[1]">
      <Link href="/" className="font-heading font-bold">
        Gainjar
      </Link>
      <div className="flex justify-center items-center gap-4 font-mono uppercase text-xs">
        <Link href={"/dashboard"} className="hover:underline">
          Dashboard
        </Link>
      <RainbowKitConnectButton />
      </div>
    </nav>
  );
}
