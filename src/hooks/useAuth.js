/**
 * Auth context helper hook.
 */

import { useContext } from "react";
import { AuthContext } from "../app/providers/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
