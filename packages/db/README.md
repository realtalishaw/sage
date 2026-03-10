# @sage/db

Shared database package for the Sage monorepo. Includes Supabase client configuration, migrations, and type definitions.

## Setup

### Environment Variables

Copy the `.env.example` to `.env` in your app and add the following:

**For Vite apps** (client-side), use the `VITE_` prefix:

```env
VITE_SUPABASE_URL=https://ocaybxaeoqrryyynznhp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**For Node.js/server-side apps**:

```env
SUPABASE_URL=https://ocaybxaeoqrryyynznhp.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Only for server-side
```

The client automatically detects whether it's running in a Vite or Node.js environment and uses the appropriate variables.

## Usage

### Import the Supabase Client

```typescript
import { supabase } from '@sage/db';

// Use the client
const { data, error } = await supabase.from('users').select('*');
```

### Create a Custom Client

```typescript
import { createSupabaseClient } from '@sage/db';

// Create a client with service role (server-side only)
const adminClient = createSupabaseClient({ serviceRole: true });

// Create a client with a specific access token
const userClient = createSupabaseClient({ accessToken: 'user-token' });
```

### Import Types

```typescript
import type { Database } from '@sage/db/types';

// Use the types
type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
```

### Access Configuration

```typescript
import { config } from '@sage/db';

console.log('Supabase URL:', config.url);
console.log('Anon Key:', config.anonKey);
```

For detailed usage examples in Vite apps, see [USAGE.md](./USAGE.md).

## Development

### Start Local Supabase

```bash
pnpm db:start
```

This starts a local Supabase instance with Docker. Access:
- Studio: http://localhost:54323
- API: http://localhost:54321
- DB: postgresql://postgres:postgres@localhost:54322/postgres

### Create a Migration

```bash
pnpm db:migrate my_migration_name
```

This creates a new migration file in `supabase/migrations/`.

### Apply Migrations

```bash
# Reset local database with migrations
pnpm db:reset

# Push migrations to remote
pnpm db:push
```

### Generate Types

After creating tables, generate TypeScript types:

```bash
pnpm db:types
```

This updates `src/types.ts` with your database schema.

### Stop Local Supabase

```bash
pnpm db:stop
```

## Project Structure

```
packages/db/
├── src/
│   ├── client.ts    # Supabase client setup
│   ├── types.ts     # Database type definitions
│   └── index.ts     # Package exports
├── supabase/
│   ├── config.toml  # Supabase configuration
│   ├── migrations/  # Database migrations
│   └── seed.sql     # Seed data
└── package.json
```

## Scripts

- `pnpm build` - Build the package
- `pnpm dev` - Watch mode for development
- `pnpm db:start` - Start local Supabase
- `pnpm db:stop` - Stop local Supabase
- `pnpm db:reset` - Reset local database with migrations
- `pnpm db:migrate` - Create a new migration
- `pnpm db:push` - Push migrations to remote
- `pnpm db:pull` - Pull schema from remote
- `pnpm db:types` - Generate TypeScript types from schema
