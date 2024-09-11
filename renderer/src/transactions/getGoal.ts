import { gql } from "@apollo/client";

export const GET_GOAL = gql`
  query ($category: String!) {
    goal(category: $category) {
      description
      requirement {
        time
        score
        cpm
        correct
        incorrect
        capital
        punctuation
        numbers
      }
      category
      language
      level
      keyboard
      complete
    }
  }
`;
