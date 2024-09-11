import { gql } from "@apollo/client";

export const GET_RECOMMENDATIONS = gql`
    query {
        speed: recommendations(category: "speed")
        accuracy: recommendations(category: "accuracy")
        ergonomics: recommendations(category: "ergonomics")
        practice: recommendations(category: "practice")
        rhythm: recommendations(category: "rhythm")
    }
`