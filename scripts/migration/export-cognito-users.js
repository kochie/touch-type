#!/usr/bin/env node
/**
 * Export users from AWS Cognito User Pool
 * 
 * Usage: node export-cognito-users.js
 * 
 * Output: cognito-users.json
 */

const { 
  CognitoIdentityProviderClient, 
  ListUsersCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const fs = require('fs');
require('dotenv').config();

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

async function exportUsers() {
  const users = [];
  let paginationToken;

  console.log('Exporting users from Cognito...');

  do {
    const command = new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Limit: 60,
      PaginationToken: paginationToken,
    });

    const response = await client.send(command);

    for (const user of response.Users || []) {
      const attributes = {};
      for (const attr of user.Attributes || []) {
        attributes[attr.Name] = attr.Value;
      }

      users.push({
        username: user.Username,
        email: attributes.email,
        email_verified: attributes.email_verified === 'true',
        name: attributes.name,
        phone_number: attributes.phone_number,
        phone_verified: attributes.phone_number_verified === 'true',
        preferred_username: attributes.preferred_username,
        sub: attributes.sub, // Cognito user ID
        created_at: user.UserCreateDate,
        status: user.UserStatus,
        enabled: user.Enabled,
      });
    }

    paginationToken = response.PaginationToken;
    console.log(`Exported ${users.length} users...`);
  } while (paginationToken);

  // Write to file
  fs.writeFileSync(
    'cognito-users.json',
    JSON.stringify(users, null, 2)
  );

  console.log(`Successfully exported ${users.length} users to cognito-users.json`);
  return users;
}

exportUsers().catch(console.error);
