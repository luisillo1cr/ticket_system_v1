/**
 * Login page for admin and client access.
 */

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../config/firebase";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";

function getFirebaseErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "El correo electrónico no tiene un formato válido.";
    case "auth/missing-password":
      return "Debe ingresar la contraseña.";
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/user-disabled":
      return "Esta cuenta se encuentra deshabilitada.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intente nuevamente más tarde.";
    default:
      return "No fue posible iniciar sesión. Verifique sus credenciales.";
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(ROUTES.APP, { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      navigate(ROUTES.APP, { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage(getFirebaseErrorMessage(error.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-[#E0E0E0]">
          Iniciar sesión
        </h2>
        <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 dark:text-[#B0B0B0]">
          Ingrese con su cuenta autorizada para acceder al portal.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="label-base">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="input-base"
            placeholder="correo@dominio.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label-base">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="input-base"
            placeholder="Ingrese su contraseña"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;