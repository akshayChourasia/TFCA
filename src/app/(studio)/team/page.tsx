import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ROLES, ROLE_LABELS, ROLE_SUMMARY, can } from "@/lib/roles";
import { AddMemberForm, MemberRow } from "@/components/TeamManager";

export default async function TeamPage() {
  const user = await requireUser();
  if (!can(user.role, "team.manage")) {
    return <div className="p-8 text-neutral-600">Only admins can manage the team.</div>;
  }
  const members = await db.query.teamUsers.findMany({
    where: eq(schema.teamUsers.orgId, user.org.id),
    orderBy: asc(schema.teamUsers.createdAt),
  });
  const roles = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">Team & logins</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Add team members with their mobile number. They get a temporary password and set their own on first login.
      </p>
      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Mobile</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Login</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={{
                  id: m.id,
                  name: m.name,
                  phone: m.phone,
                  role: m.role,
                  active: m.active,
                  hasPassword: !!m.passwordHash,
                  mustChangePassword: m.mustChangePassword,
                  isMe: m.id === user.id,
                }}
                roles={roles}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold">Add team member</h2>
          <AddMemberForm roles={roles} />
        </div>
        <div className="rounded-lg border bg-white p-5 text-sm">
          <h2 className="font-semibold">What each role can do</h2>
          <dl className="mt-2 space-y-1.5">
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="font-medium inline">{ROLE_LABELS[r]}: </dt>
                <dd className="inline text-neutral-600">{ROLE_SUMMARY[r]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
