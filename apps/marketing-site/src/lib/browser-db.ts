import { supabase } from "./supabase";
import type { BootstrapProfile, BootstrapReview } from "./groq-bootstrap";
import type { RandomAvatarState } from "../avatar/random";

/*
  This file is a browser-safe shim for the marketing site.

  The shared @sage/db package is designed to work across environments, but the
  landing page is a Vite browser app that already owns its own Supabase client
  based on import.meta.env. Re-exporting the small subset of DB helpers used by
  the marketing flows keeps the frontend simple and ensures .env values from
  this app are the ones that get read.
*/

export async function validateInviteCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("invite_codes")
    .select("id, owner_id, is_claimed, expires_at")
    .eq("code", normalizedCode)
    .eq("is_claimed", false)
    .single();

  if (error) {
    return { isValid: false, data: null, error };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { isValid: false, data: null, error: new Error("Invite code has expired") };
  }

  return { isValid: true, data, error: null };
}

export async function claimInviteCode(code: string, userId: string) {
  const normalizedCode = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("invite_codes")
    .update({
      is_claimed: true,
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq("code", normalizedCode)
    .eq("is_claimed", false)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
}

async function generateUniqueReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let code = "";

    for (let index = 0; index < 5; index += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Use RPC to check uniqueness (RLS blocks direct profiles query for other users' codes)
    const { data: exists } = await supabase.rpc("referral_code_exists" as never, { code } as never);

    if (!exists) {
      return code;
    }
  }

  throw new Error("Failed to generate unique referral code after maximum attempts");
}

export async function createProfile(params: {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  referredByCode?: string;
}) {
  let referrerId: string | null = null;

  if (params.referredByCode) {
    type ReferrerInfoRow = {
      is_valid?: boolean | null;
      referrer_id?: string | null;
    };

    // Use RPC: direct profiles query is blocked by RLS (can't read by referral_code)
    const { data: rows } = await supabase.rpc(
      "get_referrer_info" as never,
      { referral_code_input: params.referredByCode.trim().toUpperCase() } as never,
    );

    const referrerRows = (rows ?? []) as ReferrerInfoRow[];
    const row = referrerRows.length > 0 ? referrerRows[0] : null;
    referrerId = row?.is_valid && row?.referrer_id ? row.referrer_id : null;
  }

  const referralCode = await generateUniqueReferralCode();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: params.userId,
      first_name: params.firstName,
      last_name: params.lastName,
      phone_number: params.phoneNumber,
      referral_code: referralCode,
      referred_by: referrerId,
      account_type: "waitlist",
    })
    .select()
    .single();

  return { data, error };
}

export async function upgradeAccountType(userId: string, newType: "trial" | "paid") {
  const { data, error } = await supabase
    .from("profiles")
    .update({ account_type: newType })
    .eq("id", userId)
    .select()
    .single();

  return { data, error };
}

export async function getReferralStats(userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("referral_code, referral_count")
    .eq("id", userId)
    .single();

  if (profileError) {
    return {
      referralCode: "",
      totalReferrals: 0,
      referrals: [],
      error: profileError,
    };
  }

  const { data: referrals, error: referralsError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, created_at, account_type")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false });

  return {
    referralCode: profile.referral_code,
    totalReferrals: profile.referral_count,
    referrals: referrals ?? [],
    error: referralsError,
  };
}

export function generateReferralLink(referralCode: string, baseUrl?: string): string {
  const base = baseUrl ?? window.location.origin;
  return `${base}/apply?ref=${referralCode}`;
}

export function parseReferralCodeFromUrl(url?: string): string | null {
  const urlToParse = url ?? window.location.href;
  const urlObject = new URL(urlToParse);
  return urlObject.searchParams.get("ref");
}

interface SaveApplicationProfileParams {
  applicationId: string;
  userId: string;
  profile: BootstrapProfile;
  review: BootstrapReview | null;
  avatar: RandomAvatarState;
  avatarPortraitPng: string | null;
  transcript: Array<{ id: string; role: string; text: string }>;
  finalStage: string;
  completedAt: string;
}

export async function saveApplicationProfile(params: SaveApplicationProfileParams) {
  const row = {
    id: params.applicationId,
    user_id: params.userId,
    profile: params.profile,
    review: params.review ?? {
      aboutAgent: "",
      aboutUser: "",
      readinessNote: "",
    },
    avatar: params.avatar,
    avatar_portrait_png: params.avatarPortraitPng,
    transcript: params.transcript,
    final_stage: params.finalStage,
    completed_at: params.completedAt,
  };

  const { data, error } = await supabase
    .from("application_profiles")
    .upsert(row as never, {
      onConflict: "id",
    })
    .select()
    .single();

  return { data, error };
}

export async function getApplicationProfile(applicationId: string) {
  const { data, error } = await supabase
    .from("application_profiles")
    .select("id, profile, review, avatar, avatar_portrait_png, transcript, final_stage, completed_at")
    .eq("id", applicationId)
    .single();

  return { data, error };
}
