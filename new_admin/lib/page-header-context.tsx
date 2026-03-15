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
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: "",
  setTitle: () => {},
  actions: null,
  setActions: () => {},
});

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState("");
  const [actions, setActionsState] = useState<ReactNode>(null);
  const setTitle = useCallback((t: string) => setTitleState(t), []);
  const setActions = useCallback((a: ReactNode) => setActionsState(a), []);

  return (
    <PageHeaderContext.Provider value={{ title, setTitle, actions, setActions }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderContext);
}
