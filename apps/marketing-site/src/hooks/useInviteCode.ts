import { useState, useCallback } from 'react';
import { validateInviteCode, claimInviteCode } from '@sage/db';

interface UseInviteCodeReturn {
  isValidating: boolean;
  isClaiming: boolean;
  error: Error | null;
  isValid: boolean | null;
  validate: (code: string) => Promise<boolean>;
  claim: (code: string, userId: string) => Promise<boolean>;
  reset: () => void;
}

/**
 * Hook to manage invite code validation and claiming
 */
export function useInviteCode(): UseInviteCodeReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  /**
   * Validate an invite code
   * Returns true if valid, false if invalid
   */
  const validate = useCallback(async (code: string): Promise<boolean> => {
    if (!code || code.trim() === '') {
      setError(new Error('Invite code is required'));
      setIsValid(false);
      return false;
    }

    try {
      setIsValidating(true);
      setError(null);

      const result = await validateInviteCode(code.trim().toUpperCase());

      if (result.error) {
        setError(result.error as Error);
        setIsValid(false);
        return false;
      }

      setIsValid(result.isValid);
      return result.isValid;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setIsValid(false);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Claim an invite code for a user
   * Returns true if successfully claimed, false otherwise
   */
  const claim = useCallback(async (code: string, userId: string): Promise<boolean> => {
    if (!code || code.trim() === '') {
      setError(new Error('Invite code is required'));
      return false;
    }

    if (!userId) {
      setError(new Error('User ID is required'));
      return false;
    }

    try {
      setIsClaiming(true);
      setError(null);

      const result = await claimInviteCode(code.trim().toUpperCase(), userId);

      if (result.error) {
        setError(result.error as Error);
        return false;
      }

      return result.success;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    } finally {
      setIsClaiming(false);
    }
  }, []);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setIsValidating(false);
    setIsClaiming(false);
    setError(null);
    setIsValid(null);
  }, []);

  return {
    isValidating,
    isClaiming,
    error,
    isValid,
    validate,
    claim,
    reset,
  };
}
