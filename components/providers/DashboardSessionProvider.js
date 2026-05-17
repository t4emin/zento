"use client";

import { createContext, useContext } from "react";

const DashboardSessionContext = createContext({
  session: null,
});

export function DashboardSessionProvider({ session, children }) {
  return (
    <DashboardSessionContext.Provider value={{ session }}>
      {children}
    </DashboardSessionContext.Provider>
  );
}

export function useDashboardSession() {
  return useContext(DashboardSessionContext);
}
