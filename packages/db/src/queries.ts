/**
 * Database query helpers for invite and referral system
 */

import { supabase } from './client';
import type { Database } from './types';

// Declare window for Node.js environments
declare const window: any;

// Type helpers
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type InviteCode = Database['public']['Tables']['invite_codes']['Row'];
type ReferralEvent = Database['public']['Tables']['referral_events']['Row'];

// =============================================================================
// INVITE CODE QUERIES
// =============================================================================

/**
 * Validate an invite code
 * Checks if code exists and is unclaimed
 * Uses secure function to prevent enumeration attacks
 */
export async function validateInviteCode(code: string) {
  // @ts-expect-error - Function will exist after migration 20260310_002 is applied
  const { data, error } = await supabase.rpc('validate_invite_code_public', {
    code: code.toUpperCase(),
  });

  if (error) {
    return { isValid: false, data: null, error };
  }

  if (!data || data.length === 0) {
    return { isValid: false, data: null, error: new Error('Invalid invite code') };
  }

  const result = Array.isArray(data) ? data[0] : data;

  // Check if already claimed
  if (result.is_claimed) {
    return { isValid: false, data: null, error: new Error('Invite code already used') };
  }

  // Check if expired
  if (result.expires_at && new Date(result.expires_at) < new Date()) {
    return { isValid: false, data: null, error: new Error('Invite code has expired') };
  }

  return { isValid: true, data: result, error: null };
}

/**
 * Claim an invite code
 * Marks the code as claimed and associates it with a user
 */
export async function claimInviteCode(code: string, userId: string) {
  const { data, error } = await supabase
    .from('invite_codes')
    .update({
      is_claimed: true,
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq('code', code.toUpperCase())
    .eq('is_claimed', false)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error };
  }

  return { success: true, data, error: null };
}

/**
 * Get all invite codes for a user
 * Returns both claimed and unclaimed codes
 */
export async function getUserInviteCodes(userId: string) {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Get available (unclaimed) invite codes for a user
 */
export async function getAvailableInviteCodes(userId: string) {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_claimed', false)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Check how many invite codes a user has used
 */
export async function getUsedInviteCodesCount(userId: string) {
  const { count, error } = await supabase
    .from('invite_codes')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('is_claimed', true);

  return { count: count || 0, error };
}

// =============================================================================
// PROFILE QUERIES
// =============================================================================

/**
 * Create a new user profile
 * Optionally associates with a referrer via referral code
 */
export async function createProfile(params: {
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  referredByCode?: string;
}) {
  // Look up referrer if code provided
  let referrerId: string | null = null;
  if (params.referredByCode) {
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', params.referredByCode.toUpperCase())
      .single();

    referrerId = referrer?.id || null;
  }

  // Generate unique referral code
  const referralCode = await generateUniqueReferralCode();

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: params.userId,
      first_name: params.firstName,
      last_name: params.lastName,
      phone_number: params.phoneNumber,
      referral_code: referralCode,
      referred_by: referrerId,
      account_type: 'waitlist',
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get a user's profile by ID
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
}

/**
 * Update a user's profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'referral_code' | 'referral_count'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}

/**
 * Upgrade a user's account type (e.g., from waitlist to trial)
 * This will automatically trigger invite code generation via database trigger
 */
export async function upgradeAccountType(userId: string, newType: 'trial' | 'paid') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ account_type: newType })
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}

/**
 * Validate a referral code exists
 * Returns limited referrer info (uses secure function to prevent PII exposure)
 */
export async function validateReferralCode(code: string) {
  // @ts-expect-error - Function will exist after migration 20260310_002 is applied
  const { data, error } = await supabase.rpc('get_referrer_info', {
    referral_code_input: code.toUpperCase(),
  });

  if (error) {
    return { isValid: false, data: null, error };
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    isValid: result?.is_valid || false,
    data: result?.is_valid ? {
      id: result.referrer_id,
      first_name: result.referrer_name?.split(' ')[0] || '',
      last_name: result.referrer_name?.split(' ')[1] || '',
      referral_code: code.toUpperCase(),
    } : null,
    error: null,
  };
}

// =============================================================================
// REFERRAL QUERIES
// =============================================================================

/**
 * Get referral statistics for a user
 * Includes their referral code, count, and list of people they referred
 */
export async function getReferralStats(userId: string) {
  // Get user's referral info
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('referral_code, referral_count')
    .eq('id', userId)
    .single();

  if (profileError) {
    return {
      referralCode: '',
      totalReferrals: 0,
      referrals: [],
      error: profileError,
    };
  }

  // Get list of people they referred
  const { data: referrals, error: referralsError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, created_at, account_type')
    .eq('referred_by', userId)
    .order('created_at', { ascending: false });

  return {
    referralCode: profile.referral_code,
    totalReferrals: profile.referral_count,
    referrals: referrals || [],
    error: referralsError,
  };
}

/**
 * Get detailed referral events for a user
 * Includes IP address, user agent, etc. for fraud detection
 */
export async function getReferralEvents(userId: string) {
  const { data, error } = await supabase
    .from('referral_events')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

/**
 * Create a referral event
 * Used when someone signs up with a referral code
 * Note: This is typically handled by the database trigger, but can be called manually if needed
 */
export async function createReferralEvent(params: {
  referrerId: string;
  referredId: string;
  referralCode: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { data, error } = await supabase
    .from('referral_events')
    .insert({
      referrer_id: params.referrerId,
      referred_id: params.referredId,
      referral_code: params.referralCode,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })
    .select()
    .single();

  return { data, error };
}

// =============================================================================
// WAITLIST QUERIES
// =============================================================================

/**
 * Get authenticated user's own waitlist position
 * Uses secure function that only returns their own position
 */
export async function getMyWaitlistPosition() {
  // @ts-expect-error - Function will exist after migration 20260310_002 is applied
  const { data, error } = await supabase.rpc('get_my_waitlist_position');

  if (error) {
    return { position: null, referralCount: 0, totalInWaitlist: 0, error };
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    position: result?.waitlist_position || null,
    referralCount: result?.referral_count || 0,
    totalInWaitlist: result?.total_in_waitlist || 0,
    error: null,
  };
}

/**
 * Get waitlist rankings (ADMIN ONLY - requires service role)
 * Returns anonymized waitlist data ordered by position
 * DO NOT use this from client-side code - it will fail RLS checks
 * Use getMyWaitlistPosition() instead for individual users
 *
 * NOTE: This function will only work with a service role client, not the regular anon client
 */
export async function getWaitlistRankings(limit = 100) {
  // This requires service role permissions - will fail for regular users (by design)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, referral_count, created_at')
    .eq('account_type', 'waitlist')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return { data: [], error };
  }

  // Calculate positions client-side (only works if user has service role access)
  const rankedData = data.map((user, index) => ({
    id: user.id,
    referral_count: user.referral_count,
    created_at: user.created_at,
    calculated_position: (index + 1) - user.referral_count,
  }));

  return { data: rankedData, error: null };
}

/**
 * Get total waitlist count
 */
export async function getWaitlistCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('account_type', 'waitlist');

  return { count: count || 0, error };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique referral code (5 chars, SMS-optimized)
 * No ambiguous characters: 0, O, 1, I removed
 */
async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check uniqueness
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code!)
      .single();

    isUnique = !data;
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code after maximum attempts');
  }

  return code!;
}

/**
 * Generate an invite code string (6 chars)
 * This is just the string generation - actual DB insertion should use the trigger
 */
export function generateInviteCodeString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a shareable referral link
 */
export function generateReferralLink(referralCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/activate?ref=${referralCode}`;
}

/**
 * Parse referral code from URL
 */
export function parseReferralCodeFromUrl(url?: string): string | null {
  if (typeof window === 'undefined' && !url) {
    return null;
  }

  const urlToParse = url || window.location.href;
  const urlObj = new URL(urlToParse);
  return urlObj.searchParams.get('ref');
}

// =============================================================================
// ADMIN QUERIES (require service role or elevated permissions)
// =============================================================================

/**
 * Manually generate invite codes for a user
 * Typically used for admin operations or when trigger fails
 * Note: The database trigger should handle this automatically when account_type changes
 */
export async function manuallyGenerateInviteCodes(userId: string, count = 3) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push({
      code: generateInviteCodeString(),
      owner_id: userId,
    });
  }

  const { data, error } = await supabase.from('invite_codes').insert(codes).select();

  return { data, error };
}

/**
 * Get all profiles with filters
 * Admin function for managing users
 */
export async function getAllProfiles(filters?: {
  accountType?: 'waitlist' | 'trial' | 'paid';
  limit?: number;
  offset?: number;
}) {
  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (filters?.accountType) {
    query = query.eq('account_type', filters.accountType);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;

  return { data: data || [], count: count || 0, error };
}
