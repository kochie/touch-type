import { gql } from "@apollo/client";

export const GET_GOALS = gql`
    query {
        speed: goal(category: "speed")
        accuracy: goal(category: "accuracy")
        ergonomics: goal(category: "ergonomics")
        practice: goal(category: "practice")
        rhythm: goal(category: "rhythm")
    }
`