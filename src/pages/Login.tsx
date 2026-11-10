import { useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <BookOpen className="mx-auto text-brand-600" size={32} aria-hidden />
          <h1 className="mt-2 text-xl font-semibold">Library staff sign in</h1>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input id="email" type="email" required autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs text-slate-500">
          Demo: admin@library.test / Admin123! · librarian@library.test / Librarian123!
        </p>
      </form>
    </div>
  );
}
