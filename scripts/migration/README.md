# Data Migration Scripts

These scripts help migrate data from AWS (Cognito + DynamoDB) to Supabase.

## Prerequisites

1. Install AWS CLI and configure credentials
2. Set up Supabase project and run the database migration
3. Install Node.js dependencies: `npm install @aws-sdk/client-cognito-identity-provider @aws-sdk/client-dynamodb @supabase/supabase-js`

## Environment Variables

Create a `.env` file in this directory with:

```
# AWS Configuration
AWS_REGION=ap-southeast-2
COGNITO_USER_POOL_ID=your-user-pool-id
DYNAMODB_RESULTS_TABLE=your-results-table
DYNAMODB_SETTINGS_TABLE=your-settings-table
DYNAMODB_GOALS_TABLE=your-goals-table

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Migration Steps

### 1. Export Cognito Users

```bash
node export-cognito-users.js
```

This exports all users from Cognito to `cognito-users.json`.

### 2. Import Users to Supabase

```bash
node import-users-to-supabase.js
```

This creates users in Supabase Auth with temporary passwords.
Users will need to reset their passwords on first login.

### 3. Export DynamoDB Data

```bash
node export-dynamodb-data.js
```

This exports results, settings, and goals to JSON files.

### 4. Import Data to Supabase

```bash
node import-data-to-supabase.js
```

This imports all data to Supabase PostgreSQL.

## Important Notes

- Run migrations during low-traffic periods
- Test with a subset of users first
- Passwords cannot be migrated from Cognito - users must reset passwords
- Consider using Supabase's magic link for the initial login after migration
