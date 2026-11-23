import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function AccountPage(props: PageProps<"/account">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const first = sp.first === "1" || user.mustChangePassword;
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        {!user.mustChangePassword && (
          <Link href="/issues" className="text-sm text-neutral-500 hover:underline">← Back</Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{first ? "Set your password" : "Change password"}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {first
            ? `Welcome, ${user.name}. Replace the temporary password your admin gave you with your own.`
            : `Logged in as ${user.name} (${user.phone}).`}
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
