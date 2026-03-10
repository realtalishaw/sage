// Schema, migrations, repositories, connection management
export { supabase, getSupabaseClient, createSupabaseClient, config } from './client';
export type { Database, Json } from './types';

// Invite and Referral System Queries
export {
  // Invite code queries
  validateInviteCode,
  claimInviteCode,
  getUserInviteCodes,
  getAvailableInviteCodes,
  getUsedInviteCodesCount,
  // Profile queries
  createProfile,
  getProfile,
  updateProfile,
  upgradeAccountType,
  validateReferralCode,
  // Referral queries
  getReferralStats,
  getReferralEvents,
  createReferralEvent,
  // Waitlist queries
  getMyWaitlistPosition,
  getWaitlistRankings, // ADMIN ONLY
  getWaitlistCount,
  // Helper functions
  generateInviteCodeString,
  generateReferralLink,
  parseReferralCodeFromUrl,
  // Admin queries
  manuallyGenerateInviteCodes,
  getAllProfiles,
} from './queries';
