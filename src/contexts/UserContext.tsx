import React, { createContext, useContext, ReactNode } from 'react';

interface User {
  name: string;
  plan: string;
  avatar: string;
}

const UserContext = createContext<User>({
  name: "Darrell Warner",
  plan: "Premium Member",
  avatar: "/content/avatar.jpg"
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  return (
    <UserContext.Provider value={{
      name: "Darrell Warner",
      plan: "Premium Member",
      avatar: "/content/avatar.jpg"
    }}>
      {children}
    </UserContext.Provider>
  );
};













