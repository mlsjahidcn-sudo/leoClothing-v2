import { createClient } from "@supabase/supabase-js";
async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  // Categories should have 4 rows
  const { data: cats, error: e1 } = await admin.from("categories").select("id, slug, label").limit(10);
  console.log("categories:", cats?.length, "err:", e1?.message ?? "none");
  // Products should have 13
  const { data: prods, error: e2 } = await admin.from("products").select("id, name").limit(20);
  console.log("products:", prods?.length, "err:", e2?.message ?? "none");
  // Auth users
  const { data: users, error: e3 } = await admin.auth.admin.listUsers({ perPage: 10 });
  console.log("auth users:", users?.users?.length ?? 0, "err:", e3?.message ?? "none");
  if (users?.users?.length) console.log("emails:", users.users.map((u) => u.email));
  // admin_profiles
  const { data: profs, error: e4 } = await admin.from("admin_profiles").select("id, email, role");
  console.log("admin_profiles:", profs?.length ?? 0, "err:", e4?.message ?? "none");
  if (profs?.length) console.log("profiles:", JSON.stringify(profs, null, 2));
}
main();