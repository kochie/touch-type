import { gql } from "@apollo/client";

export const PUT_SETTINGS = gql`
  mutation ($userId: String, $settings: InputSettings) {
    putSettings(userId: $userId, settings: $settings) {
      keyboard
      level {
        pattern
        flags
      }
      analytics
      levelName
      keyboardName
      whatsNewOnStartup
    }
  }
`;