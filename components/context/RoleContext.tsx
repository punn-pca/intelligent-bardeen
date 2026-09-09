'use client';

import React, { createContext, useContext, useState } from 'react';

interface RoleContextType {
  currentRole: string;
  setCurrentRole: (role: string) => void;
}

const RoleContext = createContext<RoleContextType>({
  currentRole: 'ADMIN',
  setCurrentRole: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<string>('ADMIN');

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
