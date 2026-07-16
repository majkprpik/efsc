"use client";

import { createContext, useContext } from "react";

type Profile = { name: string; email: string; initials: string };

const ProfileContext = createContext<Profile | null>(null);

/** Fed by the app layout so PageHeader can show account controls. */
export function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
