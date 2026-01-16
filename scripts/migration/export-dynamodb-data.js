#!/usr/bin/env node
/**
 * Export data from DynamoDB tables
 * 
 * Usage: node export-dynamodb-data.js
 * 
 * Output: dynamodb-results.json, dynamodb-settings.json, dynamodb-goals.json
 */

const { 
  DynamoDBClient, 
  ScanCommand 
} = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const fs = require('fs');
require('dotenv').config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

async function scanTable(tableName) {
  const items = [];
  let lastEvaluatedKey;

  console.log(`Scanning table: ${tableName}...`);

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await client.send(command);

    for (const item of response.Items || []) {
      items.push(unmarshall(item));
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
    console.log(`Scanned ${items.length} items from ${tableName}...`);
  } while (lastEvaluatedKey);

  return items;
}

async function exportData() {
  // Export results
  if (process.env.DYNAMODB_RESULTS_TABLE) {
    const results = await scanTable(process.env.DYNAMODB_RESULTS_TABLE);
    fs.writeFileSync('dynamodb-results.json', JSON.stringify(results, null, 2));
    console.log(`Exported ${results.length} results`);
  }

  // Export settings
  if (process.env.DYNAMODB_SETTINGS_TABLE) {
    const settings = await scanTable(process.env.DYNAMODB_SETTINGS_TABLE);
    fs.writeFileSync('dynamodb-settings.json', JSON.stringify(settings, null, 2));
    console.log(`Exported ${settings.length} settings`);
  }

  // Export goals
  if (process.env.DYNAMODB_GOALS_TABLE) {
    const goals = await scanTable(process.env.DYNAMODB_GOALS_TABLE);
    fs.writeFileSync('dynamodb-goals.json', JSON.stringify(goals, null, 2));
    console.log(`Exported ${goals.length} goals`);
  }

  console.log('Export complete!');
}

exportData().catch(console.error);
