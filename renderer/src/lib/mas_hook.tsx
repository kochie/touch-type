import { createContext, useContext, useLayoutEffect, useState } from "react";

type MasContextProps = boolean;

const MasContext = createContext<MasContextProps>(true);

export const MasProvider = ({ children }) => {
  const [_isMas, setMas] = useState<boolean>(true);

  useLayoutEffect(() => {
    // @ts-expect-error
    window.electronAPI.isMas().then(setMas);
  }, []);

  return <MasContext.Provider value={_isMas}>{children}</MasContext.Provider>;
};

export function useMas() {
  return useContext(MasContext);
}
