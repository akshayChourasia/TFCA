import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, can } from "@/lib/roles";
import { logout } from "@/app/auth-actions";

export default async function StudioLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/account?first=1");
  const link = "rounded px-3 py-2 hover:bg-white/10";
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-[#1d2b4f] text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-xs uppercase tracking-widest text-white/60">Magazine Studio</div>
          <div className="text-lg font-semibold leading-tight mt-1">{user.org.name}</div>
        </div>
        <nav className="flex flex-col p-3 gap-1 text-sm">
          <Link className={link} href="/issues">Issues</Link>
          <span className="rounded px-3 py-2 text-white/40" title="Coming in a later release">Content inbox</span>
          {can(user.role, "ads.manage") && <Link className={link} href="/advertisers">Advertisers</Link>}
          <span className="rounded px-3 py-2 text-white/40" title="Coming in a later release">Members</span>
          {can(user.role, "team.manage") && <Link className={link} href="/team">Team & logins</Link>}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4 text-sm">
          <div className="font-semibold">{user.name}</div>
          <div className="text-white/60">{ROLE_LABELS[user.role]}</div>
          <div className="mt-2 flex gap-3">
            <Link href="/account" className="text-white/80 hover:underline">Password</Link>
            <form action={logout}>
              <button className="text-white/80 hover:underline">Log out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
