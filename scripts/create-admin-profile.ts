import { createClient } from "@supabase/supabase-js";
async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  // Get the auth user to confirm and grab their email
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 50 });
  const target = users?.users?.find((u) => u.id === "f83adba9-e5f2-4a65-a7d1-428bca9a5594");
  if (!target) {
    console.log("UUID not found in auth.users. Available IDs:");
    console.log(users?.users?.map((u) => `${u.id}  ${u.email}`));
    return;
  }
  console.log("Found auth user:", target.id, target.email);
  // Insert into admin_profiles
  const { data, error } = await admin
    .from("admin_profiles")
    .upsert(
      { id: target.id, email: target.email, name: "Admin", role: "superadmin" },
      { onConflict: "id" }
    )
    .select("id, email, name, role")
    .single();
  if (error) {
    console.log("INSERT ERR:", error.message);
  } else {
    console.log("Upserted admin_profiles:", JSON.stringify(data, null, 2));
  }
  // Verify
  const { data: all } = await admin.from("admin_profiles").select("id, email, role");
  console.log("All admin_profiles now:", all);
}
main();