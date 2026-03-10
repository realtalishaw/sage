# Usage Guide for Vite Apps

## Quick Start

### 1. Install the package

In your Vite app's `package.json`:

```json
{
  "dependencies": {
    "@sage/db": "workspace:*"
  }
}
```

Run `pnpm install` in your app directory.

### 2. Set up environment variables

Create a `.env` file in your Vite app's root:

```env
VITE_SUPABASE_URL=https://ocaybxaeoqrryyynznhp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jYXlieGFlb3Fycnl5eW56bmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDcwMDksImV4cCI6MjA4ODY4MzAwOX0.8JJdtCkb5Zd-ayFi7Ov3ULagfprXqCLwhQEeDJHaPrs
```

**Important:** Vite requires the `VITE_` prefix for environment variables to be exposed to the browser.

### 3. Use the client in your app

```typescript
import { supabase } from '@sage/db';

// Example: Fetch data
async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('Users:', data);
}

// Example: Insert data
async function createUser(email: string, name: string) {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, name })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return;
  }

  console.log('Created user:', data);
}

// Example: Subscribe to changes (Realtime)
supabase
  .channel('users-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'users' },
    (payload) => {
      console.log('Change detected:', payload);
    }
  )
  .subscribe();
```

## Authentication Examples

```typescript
import { supabase } from '@sage/db';

// Sign up
async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Error signing up:', error);
    return;
  }

  console.log('User signed up:', data.user);
}

// Sign in
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error);
    return;
  }

  console.log('User signed in:', data.user);
}

// Sign out
async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return;
  }

  console.log('User signed out');
}

// Get current user
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  return user;
}

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);

  if (event === 'SIGNED_IN') {
    console.log('User is signed in');
  } else if (event === 'SIGNED_OUT') {
    console.log('User is signed out');
  }
});
```

## TypeScript Types

```typescript
import type { Database } from '@sage/db/types';

// Extract table types
type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];

// Use in your components
interface UserCardProps {
  user: User;
}

function UserCard({ user }: UserCardProps) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

## React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@sage/db';
import type { Database } from '@sage/db/types';

type User = Database['public']['Tables']['users']['Row'];

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          // Refetch when changes occur
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { users, loading, error };
}

// Use in component
function UsersList() {
  const { users, loading, error } = useUsers();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anonymous key (safe for client-side) |

**Note:** The `VITE_` prefix is required for Vite to expose these variables to the browser. Without it, the variables will be `undefined` in your app.
