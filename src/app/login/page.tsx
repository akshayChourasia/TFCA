import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/issues");
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1d2b4f] p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="text-xs uppercase tracking-widest text-neutral-500">Magazine Studio</div>
        <h1 className="mt-1 text-2xl font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-neutral-600">Use the mobile number and password your admin gave you.</p>
        <LoginForm />
      </div>
    </div>
  );
}
