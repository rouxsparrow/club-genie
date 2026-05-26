"use client";

import { createContext, useContext } from "react";
import type { AdminClub } from "./club-selector";

type AdminClubContextValue = {
  club: AdminClub | null;
};

const AdminClubContext = createContext<AdminClubContextValue>({ club: null });

export function AdminClubProvider(props: { club: AdminClub | null; children: React.ReactNode }) {
  return <AdminClubContext.Provider value={{ club: props.club }}>{props.children}</AdminClubContext.Provider>;
}

export function useAdminClub() {
  return useContext(AdminClubContext);
}

