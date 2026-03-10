import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getReferralStats } from '@sage/db';

interface ReferralProfile {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  account_type: string;
}

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  referrals: ReferralProfile[];
}

/**
 * Hook to manage referral statistics for a user
 * Automatically subscribes to changes in referrals
 */
export function useReferrals(userId: string | null) {
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: '',
    totalReferrals: 0,
    referrals: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const currentUserId = userId;

    async function fetchStats() {
      try {
        setLoading(true);
        const data = await getReferralStats(currentUserId);

        if (data.error) {
          setError(data.error as Error);
        } else {
          setStats({
            referralCode: data.referralCode,
            totalReferrals: data.totalReferrals,
            referrals: data.referrals,
          });
          setError(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    // Subscribe to changes in profiles table where referred_by = userId
    const subscription = supabase
      .channel(`referral-changes-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `referred_by=eq.${currentUserId}`,
        },
        () => {
          // Refetch stats when someone new is referred
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return {
    ...stats,
    loading,
    error,
  };
}
