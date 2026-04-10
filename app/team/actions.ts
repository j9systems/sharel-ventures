"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!teamMember || teamMember.role !== "Admin") {
    throw new Error("Unauthorized: Admin access required");
  }
}

export async function createTeamMember(
  name: string,
  email: string,
  role: string,
  password: string
) {
  await assertAdmin();

  // Create the auth user via the admin client
  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return { success: false, error: authError.message };
  }

  // Insert into team_members
  const { error: insertError } = await supabaseAdmin
    .from("team_members")
    .insert({
      user_id: authUser.user.id,
      name,
      email,
      role,
    });

  if (insertError) {
    // Cleanup: delete the auth user if team_members insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function updateTeamMemberRole(
  teamMemberId: string,
  newRole: string
) {
  await assertAdmin();

  const { error } = await supabaseAdmin
    .from("team_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", teamMemberId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteTeamMember(userId: string) {
  await assertAdmin();

  const { error } = await supabaseAdmin
    .from("team_members")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
