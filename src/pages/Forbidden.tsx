import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto text-amber-500" size={36} aria-hidden />
      <h1 className="mt-3 text-lg font-semibold">Administrators only</h1>
      <p className="mt-1 text-sm text-slate-600">Your role does not have access to this page.</p>
      <Link to="/" className="btn mt-4">
        Back to dashboard
      </Link>
    </div>
  );
}
