import { gql } from "@apollo/client";

export const GET_RECOMMENDATION = gql`
    query($category: String!) {
        recommendations(category: $category)
    }
`