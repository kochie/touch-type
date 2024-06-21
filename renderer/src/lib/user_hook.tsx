import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

type UserContextProps = AuthUser | null;

const UserContext = createContext<UserContextProps>(null);

export const UserProvider = ({ children }) => {
  const [user, _setUser] = useState<AuthUser | null>(null);

  // async function getUser() {
  //   try {
  //     const user = await getCurrentUser();
  //     setUser(user);
  //   } catch (error) {
  //     setUser(null);
  //   }
  // }

  useEffect(() => {
    // getUser();
    const stopCallback = Hub.listen("auth", async ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
          _setUser(payload.data);
          break;
        case "signedOut":
          _setUser(null);
          break;
        
      }
    });

    return stopCallback;
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export function useUser() {
  return useContext(UserContext);
}
