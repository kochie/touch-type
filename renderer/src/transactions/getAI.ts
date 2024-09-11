import { gql } from "@apollo/client";

export const GET_AI_DATA = gql`
  query {
    speedGoal: goal(category: "speed") {
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
    accuracyGoal: goal(category: "accuracy") {
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
    ergonomicsGoal: goal(category: "ergonomics") {
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
    practiceGoal: goal(category: "practice") {
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
    rhythmGoal: goal(category: "rhythm") {
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

    speedRecommendation: recommendations(category: "speed")
    accuracyRecommendation: recommendations(category: "accuracy")
    ergonomicsRecommendation: recommendations(category: "ergonomics")
    practiceRecommendation: recommendations(category: "practice")
    rhythmRecommendation: recommendations(category: "rhythm")
  }
`;
