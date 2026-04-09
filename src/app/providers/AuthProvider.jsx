/**
 * Authentication provider.
 *
 * Responsibilities:
 * - listen to Firebase authentication state changes
 * - load the matching Firestore profile from users/{uid}
 * - expose a normalized auth state to the rest of the application
 */

import { createContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        const profile = userSnap.exists() ? userSnap.data() : null;

        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: profile?.name ?? firebaseUser.displayName ?? "",
          role: profile?.role ?? null,
          clientId: profile?.clientId ?? null,
          active: profile?.active ?? true,
          profileExists: userSnap.exists(),
        });
      } catch (error) {
        console.error("Error loading user profile:", error);

        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName ?? "",
          role: null,
          clientId: null,
          active: true,
          profileExists: false,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      loading,
      currentUser,
      isAuthenticated: Boolean(currentUser),
      logout,
    }),
    [loading, currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}