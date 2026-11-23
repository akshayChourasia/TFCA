export type Role = "admin" | "chief_editor" | "editor" | "proofreader" | "designer" | "ad_manager" | "viewer";

export const ROLES: Role[] = ["admin", "chief_editor", "editor", "proofreader", "designer", "ad_manager", "viewer"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  chief_editor: "Chief editor",
  editor: "Editor",
  proofreader: "Proofreader",
  designer: "Designer",
  ad_manager: "Ad manager",
  viewer: "Viewer",
};

export type Permission =
  | "pages.edit" // edit page content, free mode
  | "pages.approve" // set a page to approved
  | "pages.lock" // final sign-off: lock / unlock
  | "issues.manage" // create issues, add / move / delete pages
  | "export" // print and digital PDFs
  | "export.override" // export despite preflight errors
  | "ads.manage" // advertisers, bookings, invoices, payments
  | "team.manage"; // team members, roles, passwords

const MATRIX: Record<Role, Permission[]> = {
  admin: ["pages.edit", "pages.approve", "pages.lock", "issues.manage", "export", "export.override", "ads.manage", "team.manage"],
  chief_editor: ["pages.edit", "pages.approve", "pages.lock", "issues.manage", "export", "export.override"],
  editor: ["pages.edit", "issues.manage", "export"],
  proofreader: ["pages.edit", "pages.approve", "export"],
  designer: ["pages.edit", "issues.manage", "export"],
  ad_manager: ["ads.manage", "export"],
  viewer: [],
};

export const can = (role: Role, p: Permission) => MATRIX[role].includes(p);

export const ROLE_SUMMARY: Record<Role, string> = {
  admin: "Everything, including team and passwords",
  chief_editor: "All pages, approve and lock, exports",
  editor: "Edit pages and the page plan",
  proofreader: "Edit text and approve pages",
  designer: "Edit pages, layout and free editing",
  ad_manager: "Advertisers, bookings and invoices",
  viewer: "Read only",
};
