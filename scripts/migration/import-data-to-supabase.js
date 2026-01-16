#!/usr/bin/env node
/**
 * Import data from DynamoDB exports to Supabase PostgreSQL
 * 
 * Usage: node import-data-to-supabase.js
 * 
 * Requires: user-id-mapping.json from the user import step
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load user ID mapping
let userIdMapping = {};
try {
  userIdMapping = JSON.parse(fs.readFileSync('user-id-mapping.json', 'utf-8'));
  console.log(`Loaded mapping for ${Object.keys(userIdMapping).length} users`);
} catch (error) {
  console.warn('No user-id-mapping.json found, skipping user ID translation');
}

function getSupabaseUserId(cognitoSub) {
  return userIdMapping[cognitoSub] || null;
}

async function importResults() {
  if (!fs.existsSync('dynamodb-results.json')) {
    console.log('No results file found, skipping...');
    return;
  }

  const results = JSON.parse(fs.readFileSync('dynamodb-results.json', 'utf-8'));
  console.log(`Importing ${results.length} results...`);

  let success = 0;
  let failed = 0;

  for (const result of results) {
    const supabaseUserId = getSupabaseUserId(result.userId || result.user_id);
    
    if (!supabaseUserId) {
      console.warn(`No Supabase user found for: ${result.userId || result.user_id}`);
      failed++;
      continue;
    }

    const { error } = await supabase.from('results').insert({
      user_id: supabaseUserId,
      correct: result.correct,
      incorrect: result.incorrect,
      time: result.time,
      datetime: result.datetime,
      level: result.level,
      keyboard: result.keyboard,
      language: result.language,
      capital: result.capital || false,
      punctuation: result.punctuation || false,
      numbers: result.numbers || false,
      cpm: result.cpm,
      key_presses: result.keyPresses || result.key_presses || [],
    });

    if (error) {
      console.error(`Failed to insert result:`, error.message);
      failed++;
    } else {
      success++;
    }
  }

  console.log(`Results import: ${success} success, ${failed} failed`);
}

async function importSettings() {
  if (!fs.existsSync('dynamodb-settings.json')) {
    console.log('No settings file found, skipping...');
    return;
  }

  const settings = JSON.parse(fs.readFileSync('dynamodb-settings.json', 'utf-8'));
  console.log(`Importing ${settings.length} settings...`);

  let success = 0;
  let failed = 0;

  for (const setting of settings) {
    const supabaseUserId = getSupabaseUserId(setting.userId || setting.user_id);
    
    if (!supabaseUserId) {
      console.warn(`No Supabase user found for: ${setting.userId || setting.user_id}`);
      failed++;
      continue;
    }

    const { error } = await supabase.from('settings').upsert({
      user_id: supabaseUserId,
      analytics: setting.analytics ?? true,
      blinker: setting.blinker ?? true,
      capital: setting.capital ?? false,
      keyboard_name: setting.keyboardName || setting.keyboard_name || 'MACOS_US_QWERTY',
      language: setting.language || 'en',
      level_name: setting.levelName || setting.level_name || '1',
      numbers: setting.numbers ?? false,
      publish_to_leaderboard: setting.publishToLeaderboard ?? setting.publish_to_leaderboard ?? true,
      punctuation: setting.punctuation ?? false,
      theme: setting.theme || 'system',
      whats_new_on_startup: setting.whatsNewOnStartup ?? setting.whats_new_on_startup ?? true,
    }, { onConflict: 'user_id' });

    if (error) {
      console.error(`Failed to insert settings:`, error.message);
      failed++;
    } else {
      success++;
    }
  }

  console.log(`Settings import: ${success} success, ${failed} failed`);
}

async function importGoals() {
  if (!fs.existsSync('dynamodb-goals.json')) {
    console.log('No goals file found, skipping...');
    return;
  }

  const goals = JSON.parse(fs.readFileSync('dynamodb-goals.json', 'utf-8'));
  console.log(`Importing ${goals.length} goals...`);

  let success = 0;
  let failed = 0;

  for (const goal of goals) {
    const supabaseUserId = getSupabaseUserId(goal.userId || goal.user_id);
    
    if (!supabaseUserId) {
      console.warn(`No Supabase user found for: ${goal.userId || goal.user_id}`);
      failed++;
      continue;
    }

    const { error } = await supabase.from('goals').upsert({
      user_id: supabaseUserId,
      category: goal.category,
      description: goal.description,
      keyboard: goal.keyboard,
      language: goal.language,
      level: goal.level,
      complete: goal.complete || false,
      requirement: goal.requirement || {},
    }, { onConflict: 'user_id,category' });

    if (error) {
      console.error(`Failed to insert goal:`, error.message);
      failed++;
    } else {
      success++;
    }
  }

  console.log(`Goals import: ${success} success, ${failed} failed`);
}

async function main() {
  console.log('Starting data import to Supabase...\n');

  await importResults();
  await importSettings();
  await importGoals();

  console.log('\nData import complete!');
}

main().catch(console.error);
