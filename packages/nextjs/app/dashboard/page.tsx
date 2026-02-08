import { redirect } from "next/navigation";

const page = () => {
  return redirect("/dashboard/employer");
};

export default page;
