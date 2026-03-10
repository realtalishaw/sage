# Supabase Integration Guide

This app is now integrated with Supabase! Here's everything you need to know.

## Setup Complete ✓

- ✅ Supabase client installed
- ✅ Environment variables configured
- ✅ Supabase client initialized (`src/lib/supabase.ts`)
- ✅ Authentication hook created (`src/hooks/useAuth.ts`)
- ✅ Generic query hook created (`src/hooks/useSupabaseQuery.ts`)
- ✅ Example component provided (`src/components/SupabaseExample.tsx`)

## Quick Start

### 1. Basic Usage

```typescript
import { supabase } from './lib/supabase';

// Query data
const { data, error } = await supabase
  .from('your_table')
  .select('*');

// Insert data
const { data, error } = await supabase
  .from('your_table')
  .insert({ name: 'John', email: 'john@example.com' });
```

### 2. Using Authentication Hook

```typescript
import { useAuth } from './hooks';

function MyComponent() {
  const { user, loading, signIn, signUp, signOut, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome {user?.email}!</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return <LoginForm onSignIn={signIn} />;
}
```

### 3. Using Query Hook

```typescript
import { useSupabaseQuery } from './hooks';

function UsersList() {
  const { data: users, loading, error, refetch } = useSupabaseQuery(
    'users',
    (query) => query.select('*').order('created_at', { ascending: false }),
    { realtime: true } // Auto-refresh on database changes
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### 4. Example Component

Check out `src/components/SupabaseExample.tsx` for a complete authentication example.

To add it to your app:

```typescript
import { SupabaseExample } from './components/SupabaseExample';

function App() {
  return (
    <div>
      <SupabaseExample />
    </div>
  );
}
```

## Available Hooks

### `useAuth()`

Manages authentication state and provides helper methods.

**Returns:**
- `user`: Current user object or null
- `session`: Current session or null
- `loading`: Loading state
- `isAuthenticated`: Boolean indicating if user is signed in
- `signIn(email, password)`: Sign in method
- `signUp(email, password)`: Sign up method
- `signOut()`: Sign out method
- `resetPassword(email)`: Password reset method

### `useSupabaseQuery(table, queryFn?, options?)`

Generic hook for database queries with optional realtime updates.

**Parameters:**
- `table`: Table name
- `queryFn`: Optional function to modify the query
- `options.realtime`: Enable realtime subscriptions (default: false)
- `options.dependencies`: Array of dependencies for refetching

**Returns:**
- `data`: Query results
- `error`: Error object if any
- `loading`: Loading state
- `refetch()`: Manual refetch function

## Environment Variables

Required variables (already set in `.env`):

```env
VITE_SUPABASE_URL=https://ocaybxaeoqrryyynznhp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## TypeScript Types

Database types are defined in `src/lib/supabase.ts`. As you add tables to your database, update the `Database` interface:

```typescript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
    };
  };
}
```

Or auto-generate them from your database:

```bash
# From packages/db directory
pnpm db:types

# Then copy the generated types to src/lib/supabase.ts
```

## Common Patterns

### Protected Routes

```typescript
import { useAuth } from './hooks';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
}
```

### Realtime Subscriptions

```typescript
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      (payload) => {
        console.log('Change received!', payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### File Upload

```typescript
const uploadFile = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('bucket-name')
    .upload(`folder/${file.name}`, file);

  if (error) throw error;
  return data;
};
```

## Next Steps

1. Create your database tables in Supabase Studio
2. Set up Row Level Security (RLS) policies
3. Generate TypeScript types from your schema
4. Build your features using the hooks provided

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript)
- [React with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
