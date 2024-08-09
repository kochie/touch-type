import { createContext, useContext, useLayoutEffect, useState } from "react";
import { AuthUser, getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

type UserContextProps = AuthUser | null;

const UserContext = createContext<UserContextProps>(null);

export const UserProvider = ({ children }) => {
  const [user, _setUser] = useState<AuthUser | null>(null);


  useLayoutEffect(() => {
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

  
    useLayoutEffect(() => {
      getCurrentUser().then((user) => {
        _setUser(user);
      });
    }, [])

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export function useUser() {
  return useContext(UserContext);
}
