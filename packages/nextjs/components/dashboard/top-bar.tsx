import Link from "next/link";
import { Button } from "../ui/button";

export default function TopBar() {
  return (
    <div className="border-border border-b border max-w-5xl mx-auto flex gap-2 px-4">
      <Link href={"/dashboard/employer"}>
        <Button size={"lg"}>Employer</Button>
      </Link>
      <Link href={"/dashboard/employee"}>
        <Button size={"lg"}>Employee</Button>
      </Link>
    </div>
  );
}
