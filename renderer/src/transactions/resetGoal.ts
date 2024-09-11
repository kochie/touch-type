import { gql } from "@apollo/client";

export const RESET_GOAL = gql`
  mutation ($category: String!) {
    newGoal(category: $category) {
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
