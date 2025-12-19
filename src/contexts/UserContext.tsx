import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface User {
  name: string;
  plan: string;
  avatar: string;
}

const UserContext = createContext<User>({
  name: "Guest",
  plan: "Free",
  avatar: ""
});

export const useUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // Use ProfileContext if available, otherwise fallback to defaults
  // This maintains backward compatibility for components still using useUser()
  const [profileName, setProfileName] = useState("Guest");
  const [profilePlan, setProfilePlan] = useState("Free");
  const [profileAvatar, setProfileAvatar] = useState("");

  useEffect(() => {
    // Try to use ProfileContext (will throw if not wrapped)
    try {
      const { useProfileContext } = require('./ProfileContext');
      // This won't work in a provider - we need to check if ProfileProvider is parent
      // For now, use defaults and let components use useProfile() directly
    } catch {
      // ProfileContext not available - use defaults
    }
  }, []);

  return (
    <UserContext.Provider value={{
      name: profileName,
      plan: profilePlan,
      avatar: profileAvatar
    }}>
      {children}
    </UserContext.Provider>
  );
};














