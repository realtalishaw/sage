# Invite and Referral System - Implementation Guide

This document provides a complete guide to using the invite and referral system for Sage.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [React Hooks](#react-hooks)
- [User Flows](#user-flows)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Overview

The invite and referral system provides:

1. **Invite Codes** - Single-use codes for trial/paid users (3 per user)
2. **Referral Codes** - Unlimited-use codes for waitlist users (1 per user)
3. **Waitlist Management** - Track user position and referral bonuses
4. **Analytics** - Audit trail of all referrals and invites

### Key Features

- ✅ Automatic code generation (5-6 character, SMS-optimized)
- ✅ Real-time referral tracking
- ✅ Waitlist position calculation
- ✅ Fraud detection (IP/user agent tracking)
- ✅ Row Level Security (RLS)
- ✅ TypeScript type safety

---

## Getting Started

### Prerequisites

- Docker Desktop installed and running
- Supabase CLI installed
- Environment variables configured

### Step 1: Start Supabase

```bash
cd packages/db
pnpm db:start
```

This starts a local Supabase instance at `http://localhost:54323`

### Step 2: Apply Migrations

```bash
pnpm db:reset
```

This applies all migrations and runs the seed file.

### Step 3: Generate TypeScript Types

```bash
pnpm db:types
```

This generates type definitions in `src/types.ts`.

### Step 4: Verify Setup

Open Supabase Studio: `http://localhost:54323`

Navigate to:
- **Table Editor** → Check `profiles`, `invite_codes`, `referral_events`
- **Database** → Functions → Verify `generate_referral_code()`, etc.
- **Authentication** → Create test users

---

## Database Schema

### Tables

#### `profiles`

Core user profile table, 1:1 with `auth.users`.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,           -- References auth.users(id)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  account_type TEXT,             -- 'waitlist' | 'trial' | 'paid'
  waitlist_position INTEGER,
  referral_code TEXT UNIQUE,     -- User's personal code (5 chars)
  referred_by UUID,              -- Who referred this user
  referral_count INTEGER,        -- How many they've referred
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `invite_codes`

Single-use invite codes for trial/paid users.

```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,              -- The invite code (6 chars)
  owner_id UUID,                 -- Who owns this code
  is_claimed BOOLEAN,            -- Has it been used?
  claimed_by UUID,               -- Who claimed it
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

#### `referral_events`

Audit trail of all referral activity.

```sql
CREATE TABLE referral_events (
  id UUID PRIMARY KEY,
  referrer_id UUID,              -- Who referred
  referred_id UUID,              -- Who was referred
  referral_code TEXT,            -- Code used
  ip_address INET,               -- For fraud detection
  user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

### Triggers

1. **Auto-generate referral code** - On profile creation
2. **Auto-generate invite codes** - When `account_type` → `trial`
3. **Update referral counts** - When `referred_by` changes
4. **Update timestamps** - On profile updates

---

## API Reference

All query functions are exported from `@sage/db`.

### Invite Code Queries

#### `validateInviteCode(code: string)`

Check if an invite code is valid and unclaimed.

```typescript
import { validateInviteCode } from '@sage/db';

const { isValid, data, error } = await validateInviteCode('ABC123');

if (isValid) {
  console.log('Code is valid!', data);
} else {
  console.log('Invalid code:', error);
}
```

#### `claimInviteCode(code: string, userId: string)`

Claim an invite code for a user.

```typescript
import { claimInviteCode } from '@sage/db';

const { success, data, error } = await claimInviteCode('ABC123', userId);

if (success) {
  console.log('Code claimed!', data);
}
```

#### `getUserInviteCodes(userId: string)`

Get all invite codes (claimed + unclaimed) for a user.

```typescript
import { getUserInviteCodes } from '@sage/db';

const { data, error } = await getUserInviteCodes(userId);

console.log('User has', data.length, 'invite codes');
```

### Profile Queries

#### `createProfile(params)`

Create a new user profile with optional referral.

```typescript
import { createProfile } from '@sage/db';

const { data, error } = await createProfile({
  userId: user.id,
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  referredByCode: 'ABC12', // Optional
});
```

#### `getProfile(userId: string)`

Get a user's profile.

```typescript
import { getProfile } from '@sage/db';

const { data, error } = await getProfile(userId);

console.log('Referral code:', data.referral_code);
console.log('Referral count:', data.referral_count);
```

#### `upgradeAccountType(userId: string, newType: 'trial' | 'paid')`

Upgrade a user's account (auto-generates invite codes).

```typescript
import { upgradeAccountType } from '@sage/db';

// Move user from waitlist to trial
const { data, error } = await upgradeAccountType(userId, 'trial');

// This automatically creates 3 invite codes via database trigger
```

### Referral Queries

#### `getReferralStats(userId: string)`

Get comprehensive referral statistics.

```typescript
import { getReferralStats } from '@sage/db';

const { referralCode, totalReferrals, referrals } = await getReferralStats(userId);

console.log('Your code:', referralCode);
console.log('Total referrals:', totalReferrals);
console.log('People you referred:', referrals);
```

#### `validateReferralCode(code: string)`

Check if a referral code exists.

```typescript
import { validateReferralCode } from '@sage/db';

const { isValid, data, error } = await validateReferralCode('ABC12');

if (isValid) {
  console.log('Referrer:', data.first_name, data.last_name);
}
```

### Waitlist Queries

#### `getWaitlistRankings(limit?: number)`

Get all waitlist users ordered by position.

```typescript
import { getWaitlistRankings } from '@sage/db';

const { data, error } = await getWaitlistRankings(100);

data.forEach((user, index) => {
  console.log(`#${index + 1}: ${user.first_name} - ${user.referral_count} referrals`);
});
```

#### `getWaitlistCount()`

Get total number of users on waitlist.

```typescript
import { getWaitlistCount } from '@sage/db';

const { count } = await getWaitlistCount();

console.log('Total waitlist:', count);
```

### Helper Functions

#### `generateReferralLink(code: string, baseUrl?: string)`

Generate a shareable referral link.

```typescript
import { generateReferralLink } from '@sage/db';

const link = generateReferralLink('ABC12', 'https://sage.app');
// Returns: https://sage.app/activate?ref=ABC12
```

#### `parseReferralCodeFromUrl(url?: string)`

Extract referral code from URL.

```typescript
import { parseReferralCodeFromUrl } from '@sage/db';

// In browser
const code = parseReferralCodeFromUrl();
// Parses: https://sage.app/activate?ref=ABC12 → 'ABC12'

// Or pass URL
const code = parseReferralCodeFromUrl('https://sage.app/activate?ref=XYZ78');
```

---

## React Hooks

### `useReferrals(userId: string | null)`

Hook for managing referral statistics with real-time updates.

```typescript
import { useReferrals } from '../hooks';

function ReferralDashboard() {
  const { user } = useAuth();
  const {
    referralCode,
    totalReferrals,
    referrals,
    loading,
    error,
  } = useReferrals(user?.id);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Your Referral Code: {referralCode}</h1>
      <p>Total Referrals: {totalReferrals}</p>
      <ul>
        {referrals.map((ref) => (
          <li key={ref.id}>
            {ref.first_name} {ref.last_name} - {ref.account_type}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Features:**
- Auto-subscribes to real-time changes
- Updates when new referrals are added
- Handles loading and error states

### `useInviteCode()`

Hook for validating and claiming invite codes.

```typescript
import { useInviteCode } from '../hooks';

function ActivatePage() {
  const { user } = useAuth();
  const {
    isValidating,
    isClaiming,
    error,
    isValid,
    validate,
    claim,
    reset,
  } = useInviteCode();

  const [code, setCode] = useState('');

  const handleValidate = async () => {
    const valid = await validate(code);
    if (valid) {
      console.log('Code is valid!');
    }
  };

  const handleClaim = async () => {
    const success = await claim(code, user.id);
    if (success) {
      console.log('Code claimed successfully!');
      // Upgrade user account
    }
  };

  return (
    <div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter invite code"
      />
      <button onClick={handleValidate} disabled={isValidating}>
        Validate
      </button>
      {isValid && (
        <button onClick={handleClaim} disabled={isClaiming}>
          Claim Code
        </button>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

**Features:**
- Validates codes before claiming
- Handles loading states
- Automatic error handling
- Can be reset for multiple attempts

---

## User Flows

### Flow 1: Invite Code Activation

1. User clicks "Get Started" → `/activate`
2. User enters invite code
3. System validates code using `validateInviteCode()`
4. If valid, user creates account
5. System claims code using `claimInviteCode()`
6. User's profile created with `account_type: 'trial'`

```typescript
async function activateWithInviteCode(code: string, userData: UserData) {
  // Step 1: Validate
  const { isValid } = await validateInviteCode(code);
  if (!isValid) {
    throw new Error('Invalid invite code');
  }

  // Step 2: Create auth user
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  });

  if (authError) throw authError;

  // Step 3: Create profile
  const { data: profile, error: profileError } = await createProfile({
    userId: authUser.user.id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: userData.phoneNumber,
  });

  if (profileError) throw profileError;

  // Step 4: Claim code
  const { success } = await claimInviteCode(code, authUser.user.id);
  if (!success) throw new Error('Failed to claim code');

  // Step 5: Upgrade to trial
  await upgradeAccountType(authUser.user.id, 'trial');

  return { user: authUser.user, profile };
}
```

### Flow 2: Waitlist + Referral

1. User clicks "Request Invite" → `/activate`
2. User enters: first_name, last_name, phone_number
3. User authenticates via SMS (Supabase Phone Auth)
4. Profile created with `account_type: 'waitlist'`
5. Optional: User provides referral code
6. User receives their unique referral code
7. User shares referral link to move up waitlist

```typescript
async function joinWaitlistWithReferral(
  phoneNumber: string,
  userData: UserData,
  referralCode?: string
) {
  // Step 1: Phone auth
  const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
  });

  if (authError) throw authError;

  // Step 2: Verify OTP (handled by user input)
  // ...

  // Step 3: Create profile with optional referral
  const { data: profile, error: profileError } = await createProfile({
    userId: authData.user.id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: phoneNumber,
    referredByCode: referralCode, // Optional
  });

  if (profileError) throw profileError;

  // Step 4: Generate shareable link
  const shareLink = generateReferralLink(profile.referral_code);

  return { profile, shareLink };
}
```

---

## Testing

### Local Testing

1. **Start Supabase**
   ```bash
   cd packages/db
   pnpm db:start
   ```

2. **Create Test Users**

   Open Supabase Studio → Authentication → Add User

   Create users matching the seed file UUIDs:
   - `test-waitlist-1@example.com` (UUID: `00000000-0000-0000-0000-000000000001`)
   - `test-trial-1@example.com` (UUID: `00000000-0000-0000-0000-000000000003`)

3. **Run Seed**
   ```bash
   pnpm db:reset
   ```

4. **Test Queries**

   ```typescript
   // Test referral stats
   const stats = await getReferralStats('00000000-0000-0000-0000-000000000001');
   console.log(stats); // Should show Alice's referrals

   // Test invite code validation
   const { isValid } = await validateInviteCode('INV001');
   console.log(isValid); // Should be true

   // Test waitlist rankings
   const { data } = await getWaitlistRankings();
   console.log(data); // Should show ordered list
   ```

### Test Scenarios

The seed file includes:

- ✅ Waitlist user with no referrals (Alice)
- ✅ Waitlist user referred by another (Bob)
- ✅ Trial user with invite codes (Charlie)
- ✅ Paid user with invite codes (Diana)
- ✅ Claimed invite code (INV003)
- ✅ Unclaimed invite codes
- ✅ Multiple referrals from same user (Eve → Frank, Grace)
- ✅ Referral events with attribution data

---

## Deployment

### Production Supabase Setup

1. **Create Production Project**

   Go to https://supabase.com → New Project

2. **Link Local to Production**

   ```bash
   cd packages/db
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Push Migrations**

   ```bash
   pnpm db:push
   ```

4. **Configure Environment Variables**

   Update `.env` files in your apps:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Enable Phone Auth** (Optional)

   - Go to Authentication → Providers → Phone
   - Configure Twilio credentials
   - Update `config.toml` locally to match

6. **Generate Production Types**

   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_REF > packages/db/src/types.ts
   ```

### Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Service role key never exposed to client
- ✅ Phone auth rate limiting configured
- ✅ Invite code expiration set (optional)
- ✅ IP-based fraud detection reviewed
- ✅ User input sanitized (codes converted to uppercase)

---

## Troubleshooting

### Common Issues

**Issue:** Migration fails with "relation already exists"

**Solution:** Reset the database
```bash
pnpm db:reset
```

---

**Issue:** TypeScript types not generated

**Solution:** Ensure migration is applied first
```bash
pnpm db:reset
pnpm db:types
```

---

**Issue:** Referral count not updating

**Solution:** Check trigger is active
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_referral_count';
```

---

**Issue:** Invite codes not auto-generated

**Solution:** Verify trigger on profiles table
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_generate_invite_codes';
```

---

**Issue:** RLS blocking queries

**Solution:** Check if user is authenticated
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

For service role operations, use:
```typescript
import { createSupabaseClient } from '@sage/db';
const adminClient = createSupabaseClient({ serviceRole: true });
```

---

## Next Steps

1. ✅ **Build UI Components**
   - Create `/activate` page
   - Create referral dashboard
   - Create invite code management

2. ✅ **Add Analytics**
   - Track referral conversions
   - Monitor invite code usage
   - Detect fraud patterns

3. ✅ **Implement Notifications**
   - Email when someone uses your referral
   - SMS when moved up waitlist
   - Alert when invite codes claimed

4. ✅ **Waitlist Management**
   - Auto-promote top waitlist users
   - Batch invite code generation
   - Waitlist position notifications

---

## Support

For issues or questions:
- Check `packages/db/supabase/migrations/` for schema
- Review `packages/db/src/queries.ts` for query implementations
- Check Supabase Studio for data verification
- Review RLS policies if access denied

---

**Last Updated:** 2026-03-10
**Version:** 1.0.0
