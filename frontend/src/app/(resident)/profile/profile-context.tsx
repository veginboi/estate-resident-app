"use client";

import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { Profile } from "@/lib/types";

export const ProfileContext = createContext<{ profile: Profile; setProfile: Dispatch<SetStateAction<Profile | null>> } | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside the profile layout");
  return ctx;
}
