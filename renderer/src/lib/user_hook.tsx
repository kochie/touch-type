import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Auth } from "aws-amplify";

type UserContextProps = [any, Dispatch<SetStateAction<null>>];

const UserContext = createContext<UserContextProps>([null, () => {}]);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  async function getUser() {
    try {
        const user = await Auth.currentAuthenticatedUser()
        setUser(user);
    } catch (error) {
        setUser(null);
    }
  }

  useEffect(() => {
    getUser()
  }, []);

  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  return useContext(UserContext);
}
