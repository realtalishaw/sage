import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../../../packages/db/src/types';

type QueryableRelation =
  | keyof Database['public']['Tables']
  | keyof Database['public']['Views'];

interface QueryState<T> {
  data: T | null;
  error: PostgrestError | null;
  loading: boolean;
}

/**
 * Generic hook for Supabase queries with realtime subscriptions
 *
 * @example
 * ```typescript
 * const { data, loading, error, refetch } = useSupabaseQuery(
 *   'users',
 *   (query) => query.select('*').eq('active', true),
 *   { realtime: true }
 * );
 * ```
 */
export function useSupabaseQuery<T = any>(
  table: QueryableRelation,
  queryFn?: (query: any) => any,
  options: {
    realtime?: boolean;
    dependencies?: any[];
  } = {}
) {
  const { realtime = false, dependencies = [] } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      /*
        Supabase exposes separate overloads for tables and views, so the union
        relation type needs a narrow cast here even though the runtime value is
        already restricted to known public relations.
      */
      let query = supabase.from(table as never).select();

      if (queryFn) {
        query = queryFn(query);
      }

      const { data, error } = await query;

      setState({
        data: data as T,
        error,
        loading: false,
      });
    } catch (err) {
      setState({
        data: null,
        error: err as PostgrestError,
        loading: false,
      });
    }
  }, [table, queryFn, ...dependencies]);

  useEffect(() => {
    fetchData();

    // Set up realtime subscription if enabled
    if (realtime) {
      const channel = supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            // Refetch data when changes occur
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchData, realtime, table]);

  return {
    ...state,
    refetch: fetchData,
  };
}
