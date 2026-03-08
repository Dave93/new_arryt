"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface PageHeaderContextValue {
  title: string;
  setTitle: (title: string) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: "",
  setTitle: () => {},
});

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState("");
  const setTitle = useCallback((t: string) => setTitleState(t), []);

  return (
    <PageHeaderContext.Provider value={{ title, setTitle }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderContext);
}
