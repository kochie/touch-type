import { gql } from "@apollo/client";

export const UPDATE_SETTINGS = gql`
  mutation ($settings: InputSettings!) {
    updateSettings(settings: $settings) {
      analytics
      levelName
      keyboardName
      whatsNewOnStartup
      publishToLeaderboard
    }
  }
`;
