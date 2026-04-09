/**
 * Authentication provider.
 *
 * Responsibilities:
 * - listen to Firebase authentication state changes
 * - subscribe to the matching Firestore profile from users/{uid}
 * - expose a normalized auth state to the rest of the application
 */

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);

      unsubscribeProfile = onSnapshot(
        userRef,
        (userSnap) => {
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
          setLoading(false);
        },
        (error) => {
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
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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
