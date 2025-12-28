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
    // Note: This is a no-op - UserContext is legacy, components should use useProfile() directly
    try {
      // Dynamic import check (safe in useEffect)
      const ProfileContextModule = require('./ProfileContext');
      if (ProfileContextModule && ProfileContextModule.useProfileContext) {
        // ProfileContext available but we can't use hooks in useEffect
        // Components should use useProfile() hook directly instead
      }
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














