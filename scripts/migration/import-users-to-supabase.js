#!/usr/bin/env node
/**
 * Import users from Cognito export to Supabase Auth
 * 
 * Usage: node import-users-to-supabase.js
 * 
 * Note: Passwords cannot be migrated - users will receive magic links
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapping from old Cognito user IDs to new Supabase user IDs
const userIdMapping = {};

async function importUsers() {
  console.log('Reading cognito-users.json...');
  const users = JSON.parse(fs.readFileSync('cognito-users.json', 'utf-8'));

  console.log(`Importing ${users.length} users to Supabase...`);

  const results = {
    success: [],
    failed: [],
    skipped: [],
  };

  for (const user of users) {
    try {
      // Skip users without email
      if (!user.email) {
        console.log(`Skipping user without email: ${user.username}`);
        results.skipped.push({ username: user.username, reason: 'no email' });
        continue;
      }

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // Generate a random password (users will need to reset)
      const tempPassword = crypto.randomBytes(32).toString('hex');

      // Create user in Supabase
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        email_confirm: user.email_verified,
        phone: user.phone_number,
        phone_confirm: user.phone_verified,
        password: tempPassword,
        user_metadata: {
          name: user.name,
          phone_number: user.phone_number,
          cognito_sub: user.sub, // Keep reference to old ID
        },
      });

      if (error) {
        if (error.message.includes('already been registered')) {
          console.log(`User already exists: ${user.email}`);
          results.skipped.push({ email: user.email, reason: 'already exists' });
          continue;
        }
        throw error;
      }

      // Store the mapping
      userIdMapping[user.sub] = newUser.user.id;

      console.log(`Created user: ${user.email}`);
      results.success.push({ email: user.email, supabaseId: newUser.user.id });
    } catch (error) {
      console.error(`Failed to import user ${user.email}:`, error.message);
      results.failed.push({ email: user.email, error: error.message });
    }
  }

  // Save the user ID mapping for data migration
  fs.writeFileSync(
    'user-id-mapping.json',
    JSON.stringify(userIdMapping, null, 2)
  );

  console.log('\n=== Import Results ===');
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);

  fs.writeFileSync(
    'import-results.json',
    JSON.stringify(results, null, 2)
  );

  return results;
}

importUsers().catch(console.error);
