import { gql } from "@apollo/client";

export const PUT_RESULT = gql`
  mutation ($result: InputResult!) {
    addResult(result: $result) {
      correct
      incorrect
      time
      level
      keyboard
      language
    }
  }
`;
