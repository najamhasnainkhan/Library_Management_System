import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeftRight, BadgeDollarSign, Bookmark, BookOpen, Library, LayoutDashboard, LogOut, Menu, UserCog, Users, X } from "lucide-react";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, show: true, end: true },
    { to: "/books", label: "Books", icon: Library, show: true, end: false },
    { to: "/loans", label: "Loans", icon: ArrowLeftRight, show: true, end: false },
    { to: "/reservations", label: "Reservations", icon: Bookmark, show: true, end: false },
    { to: "/fines", label: "Fines", icon: BadgeDollarSign, show: true, end: false },
    { to: "/members", label: "Members", icon: Users, show: true, end: false },
    { to: "/staff", label: "Staff accounts", icon: UserCog, show: user?.role === "admin", end: false },
  ].filter((l) => l.show);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? "bg-brand-600 text-white" : "text-indigo-100 hover:bg-brand-700"
    }`;

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between bg-brand-900 px-4 py-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-semibold">
          <BookOpen size={20} aria-hidden /> Library
        </span>
        <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </header>

      <aside
        className={`${open ? "block" : "hidden"} w-full shrink-0 flex-col bg-brand-900 p-4 text-white md:flex md:min-h-screen md:w-64`}
      >
        <div className="mb-8 hidden items-center gap-2 text-lg font-semibold md:flex">
          <BookOpen aria-hidden /> Library
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 border-t border-indigo-800 pt-4 text-sm">
          <p className="font-medium">{user?.name}</p>
          <p className="mb-3 text-xs capitalize text-indigo-200">{user?.role}</p>
          <button onClick={logout} className="flex items-center gap-2 text-indigo-100 hover:text-white">
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
