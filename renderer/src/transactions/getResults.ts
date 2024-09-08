import { gql } from "@apollo/client";

export const GET_RESULTS = gql`
  query ($since: AWSDateTime, $nextToken: String, $limit: Int) {
    results(since: $since, nextToken: $nextToken, limit: $limit) {
      items {
        correct
        incorrect
        time
        datetime
        level
        keyboard
        language
        keyPresses {
          key
          correct
          pressedKey
          timestamp
        }
        capital
        punctuation
        numbers
        cpm
      }
      nextToken
    }
  }
`;
