# AWS to Supabase Migration Guide

This document provides a comprehensive guide for migrating Touch Typer from AWS (Cognito + DynamoDB) to Supabase (Auth + PostgreSQL).

## Overview

The migration involves transferring:

| AWS Service | Supabase Equivalent | Data Type |
|-------------|---------------------|-----------|
| Cognito User Pool | Supabase Auth | User accounts & authentication |
| DynamoDB Results Table | PostgreSQL `results` table | Typing test results |
| DynamoDB Settings Table | PostgreSQL `settings` table | User preferences |
| DynamoDB Goals Table | PostgreSQL `goals` table | User goals |

## Architecture Comparison

### Before (AWS)
```
┌─────────────────┐     ┌─────────────────┐
│  AWS Cognito    │     │   DynamoDB      │
│  (User Auth)    │     │  (NoSQL Data)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │  Touch Typer │
              │     App      │
              └──────────────┘
```

### After (Supabase)
```
┌─────────────────────────────────────────┐
│              Supabase                    │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │ Supabase    │    │   PostgreSQL    │ │
│  │ Auth        │    │   Database      │ │
│  └──────┬──────┘    └────────┬────────┘ │
│         └────────┬───────────┘          │
│                  │                       │
│         ┌────────┴────────┐             │
│         │  Edge Functions │             │
│         └─────────────────┘             │
└─────────────────────────────────────────┘
                   │
            ┌──────┴──────┐
            │  Touch Typer │
            │     App      │
            └──────────────┘
```

## Prerequisites

### 1. AWS Access

Ensure you have AWS CLI configured with appropriate permissions:

```bash
# Install AWS CLI (if not installed)
brew install awscli

# Configure credentials
aws configure
```

Required IAM permissions:
- `cognito-idp:ListUsers` - To export user data
- `dynamodb:Scan` - To export table data

### 2. Supabase Project

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Note your project URL and API keys from Project Settings → API
3. Run the database migration:

```bash
cd /path/to/touch-type
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 3. Install Dependencies

```bash
cd scripts/migration
npm install @aws-sdk/client-cognito-identity-provider \
            @aws-sdk/client-dynamodb \
            @aws-sdk/util-dynamodb \
            @supabase/supabase-js \
            dotenv
```

## Environment Configuration

Create a `.env` file in `scripts/migration/`:

```bash
# AWS Configuration
AWS_REGION=ap-southeast-2
COGNITO_USER_POOL_ID=ap-southeast-2_xxxxxxxxx
DYNAMODB_RESULTS_TABLE=touchtyper-results-prod
DYNAMODB_SETTINGS_TABLE=touchtyper-settings-prod
DYNAMODB_GOALS_TABLE=touchtyper-goals-prod

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Security Note**: Never commit the `.env` file to version control. The service role key has admin privileges.

## Migration Steps

### Step 1: Export Cognito Users

Export all users from your Cognito User Pool:

```bash
cd scripts/migration
node export-cognito-users.js
```

**Output**: `cognito-users.json`

This file contains:
```json
[
  {
    "username": "user123",
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "phone_number": "+1234567890",
    "sub": "abc123-def456-...",
    "created_at": "2024-01-15T10:30:00.000Z",
    "status": "CONFIRMED",
    "enabled": true
  }
]
```

### Step 2: Import Users to Supabase Auth

Create user accounts in Supabase Auth:

```bash
node import-users-to-supabase.js
```

**Outputs**:
- `user-id-mapping.json` - Maps Cognito user IDs → Supabase user IDs
- `import-results.json` - Detailed import status report

**Example mapping file**:
```json
{
  "abc123-def456-...": "550e8400-e29b-41d4-a716-446655440000",
  "xyz789-uvw012-...": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

> ⚠️ **Important**: Passwords cannot be migrated from Cognito. Users will need to reset their passwords using magic link or "Forgot Password" flow.

### Step 3: Export DynamoDB Data

Export all data from DynamoDB tables:

```bash
node export-dynamodb-data.js
```

**Outputs**:
- `dynamodb-results.json` - Typing test results
- `dynamodb-settings.json` - User settings
- `dynamodb-goals.json` - User goals

### Step 4: Import Data to Supabase

Import all exported data to Supabase PostgreSQL:

```bash
node import-data-to-supabase.js
```

This script:
1. Reads the `user-id-mapping.json` to translate Cognito IDs to Supabase IDs
2. Imports results, settings, and goals to their respective tables
3. Reports success/failure counts for each table

## Database Schema

The Supabase PostgreSQL schema includes:

### Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `profiles` | User metadata | `id`, `email`, `name` |
| `settings` | User preferences | `user_id`, `keyboard_name`, `theme` |
| `results` | Typing test results | `user_id`, `correct`, `incorrect`, `cpm` |
| `goals` | User goals | `user_id`, `category`, `complete` |
| `challenges` | User challenges | `user_id`, `category`, `completed_at` |
| `leaderboard_scores` | Public leaderboard | `user_id`, `username`, `cpm` |
| `subscriptions` | Billing info | `user_id`, `billing_plan`, `status` |

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:

```sql
-- Example: Users can only view their own results
CREATE POLICY "Users can view own results" ON public.results
    FOR SELECT USING (auth.uid() = user_id);
```

### Automatic Triggers

When a new user signs up, triggers automatically create:
- A `profiles` record
- A `settings` record with defaults
- A `subscriptions` record with free tier

## Data Mapping

### Results Table

| DynamoDB Field | PostgreSQL Field | Notes |
|----------------|------------------|-------|
| `userId` / `user_id` | `user_id` | Translated via mapping |
| `correct` | `correct` | Direct copy |
| `incorrect` | `incorrect` | Direct copy |
| `time` | `time` | Direct copy |
| `datetime` | `datetime` | Direct copy |
| `level` | `level` | Direct copy |
| `keyboard` | `keyboard` | Direct copy |
| `language` | `language` | Direct copy |
| `capital` | `capital` | Default: `false` |
| `punctuation` | `punctuation` | Default: `false` |
| `numbers` | `numbers` | Default: `false` |
| `cpm` | `cpm` | Direct copy |
| `keyPresses` | `key_presses` | JSONB array |

### Settings Table

| DynamoDB Field | PostgreSQL Field | Default |
|----------------|------------------|---------|
| `analytics` | `analytics` | `true` |
| `blinker` | `blinker` | `true` |
| `capital` | `capital` | `false` |
| `keyboardName` | `keyboard_name` | `'MACOS_US_QWERTY'` |
| `language` | `language` | `'en'` |
| `levelName` | `level_name` | `'1'` |
| `numbers` | `numbers` | `false` |
| `publishToLeaderboard` | `publish_to_leaderboard` | `true` |
| `punctuation` | `punctuation` | `false` |
| `theme` | `theme` | `'system'` |
| `whatsNewOnStartup` | `whats_new_on_startup` | `true` |

## Handling User Authentication After Migration

Since passwords cannot be migrated, implement one of these strategies:

### Option 1: Magic Link (Recommended)

Prompt users to sign in with magic link on first access:

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    emailRedirectTo: 'https://yourapp.com/auth/callback'
  }
})
```

### Option 2: Password Reset Flow

Direct users to reset their password:

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
  redirectTo: 'https://yourapp.com/auth/reset-password'
})
```

### Option 3: Bulk Email Notification

Send an email to all migrated users informing them of the migration and providing a password reset link.

## Verification & Testing

### 1. Verify User Count

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM auth.users;
```

Compare with the number of users in `cognito-users.json`.

### 2. Verify Data Counts

```sql
SELECT 
    (SELECT COUNT(*) FROM public.results) as results_count,
    (SELECT COUNT(*) FROM public.settings) as settings_count,
    (SELECT COUNT(*) FROM public.goals) as goals_count;
```

### 3. Test User Login

1. Use magic link to sign in as a migrated user
2. Verify their results, settings, and goals are present
3. Test typing a new session and saving results

### 4. Check for Orphaned Data

```sql
-- Find results without matching users
SELECT r.id, r.user_id 
FROM public.results r 
LEFT JOIN auth.users u ON r.user_id = u.id 
WHERE u.id IS NULL;
```

## Rollback Plan

If migration fails:

1. **Keep AWS services running** until migration is verified
2. **Preserve export files** for potential re-import
3. **Document any manual changes** made during migration

To delete migrated Supabase data and start fresh:

```sql
-- ⚠️ DESTRUCTIVE: Only use if rolling back
TRUNCATE public.results CASCADE;
TRUNCATE public.settings CASCADE;
TRUNCATE public.goals CASCADE;
-- Users must be deleted via Supabase Auth API
```

## Post-Migration Checklist

- [ ] All users exported from Cognito
- [ ] All users imported to Supabase Auth
- [ ] User ID mapping file generated
- [ ] Results data exported and imported
- [ ] Settings data exported and imported
- [ ] Goals data exported and imported
- [ ] Test user login working
- [ ] Test data retrieval working
- [ ] Test new data creation working
- [ ] Update application environment variables
- [ ] Deploy updated application
- [ ] Send password reset emails to users
- [ ] Monitor for errors in first 24-48 hours
- [ ] Decommission AWS resources (after verification period)

## Troubleshooting

### "No Supabase user found" errors

The Cognito user ID wasn't found in the mapping. This happens when:
- User wasn't exported from Cognito
- User import to Supabase failed
- User was skipped (no email)

**Solution**: Check `import-results.json` for skipped/failed users.

### "User already exists" errors

The email is already registered in Supabase.

**Solution**: Either skip these users or use Supabase's merge functionality.

### Rate Limiting

Supabase Auth has rate limits. If importing many users:

```javascript
// Add delay between user imports
await new Promise(resolve => setTimeout(resolve, 100));
```

### Large Datasets

For tables with millions of rows, modify the import script to use batch inserts:

```javascript
// Batch insert example
const BATCH_SIZE = 1000;
for (let i = 0; i < results.length; i += BATCH_SIZE) {
  const batch = results.slice(i, i + BATCH_SIZE);
  await supabase.from('results').insert(batch);
}
```

## Support

For issues with the migration:
1. Check the generated log files (`import-results.json`)
2. Review Supabase Dashboard logs
3. Check AWS CloudWatch for export errors

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [AWS Cognito User Pool Export](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-users.html)
- [DynamoDB Scan Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html)
