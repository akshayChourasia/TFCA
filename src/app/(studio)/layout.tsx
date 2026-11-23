import Link from "next/link";
import { getCurrentOrg } from "@/lib/org";

export default async function StudioLayout({ children }: LayoutProps<"/">) {
  const org = await getCurrentOrg();
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-[#1d2b4f] text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-xs uppercase tracking-widest text-white/60">Magazine Studio</div>
          <div className="text-lg font-semibold leading-tight mt-1">{org.name}</div>
        </div>
        <nav className="flex flex-col p-3 gap-1 text-sm">
          <Link className="rounded px-3 py-2 hover:bg-white/10" href="/issues">Issues</Link>
          <span className="rounded px-3 py-2 text-white/40" title="Coming in the next release">Content inbox</span>
          <span className="rounded px-3 py-2 text-white/40" title="Coming in the next release">Advertisers</span>
          <span className="rounded px-3 py-2 text-white/40" title="Coming in the next release">Members</span>
        </nav>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
