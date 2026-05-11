import { createContext, useContext, useLayoutEffect, useState } from "react";

type MasContextProps = boolean;

const MasContext = createContext<MasContextProps>(false);

export const MasProvider = ({ children }) => {
  const [_isMas, setMas] = useState<boolean>(false);

  useLayoutEffect(() => {
    // electronAPI is only present when the renderer runs inside Electron.
    // In a plain browser (e.g. `pnpm dev:next`) we default isMas to false.
    if (typeof window !== "undefined" && window.electronAPI?.isMas) {
      window.electronAPI.isMas().then(setMas);
    } else {
      setMas(false);
    }
  }, []);

  return <MasContext.Provider value={_isMas}>{children}</MasContext.Provider>;
};

export function useMas() {
  return useContext(MasContext);
}
