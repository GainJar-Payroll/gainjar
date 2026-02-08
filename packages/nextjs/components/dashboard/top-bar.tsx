"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { useScrolled } from "~~/hooks/useScrolled";
import { cn } from "~~/lib/utils";

export default function TopBar() {
  const pathname = usePathname();
  const isScrolled = useScrolled(0);

  return (
    <div
      className={cn("sticky top-16 backdrop-blur-sm z-[9] transition-colors duration-200 bg-background", {
        "border-b border-black": isScrolled,
      })}
    >
      <div className="flex gap-2 px-2 pb-4 pt-0 max-w-7xl mx-auto">
        <Link href={"/dashboard/employer"}>
          <Button
            size={"lg"}
            variant={pathname === "/dashboard/employer" ? "default" : "ghost"}
            className={pathname === "/dashboard/employer" ? "font-semibold" : ""}
          >
            Employer
          </Button>
        </Link>
        <Link href={"/dashboard/employee"}>
          <Button
            size={"lg"}
            variant={pathname === "/dashboard/employee" ? "default" : "ghost"}
            className={pathname === "/dashboard/employee" ? "font-semibold" : ""}
          >
            Employee
          </Button>
        </Link>
        <div className="flex-1"></div>
        <div className="flex items-center text-xs font-mono text-muted-foreground">
          {pathname === "/dashboard/employer" && <span>📊 Employer Dashboard</span>}
          {pathname === "/dashboard/employee" && <span>💰 Employee Dashboard</span>}
        </div>
      </div>
    </div>
  );
}
