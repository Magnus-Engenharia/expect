import { NavLink } from "react-router";
import type { UserProfile } from "../data.ts";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/team", label: "Team", icon: "👥" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
  { to: "/billing", label: "Billing", icon: "💳" },
  { to: "/features", label: "Features", icon: "🚩" },
];

interface LayoutProps {
  currentUser: UserProfile;
  children: React.ReactNode;
}

export const Layout = ({ currentUser, children }: LayoutProps) => (
  <div className="flex h-screen bg-gray-50">
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">TeamForge</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-700 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium">
            {currentUser.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
    <main className="flex-1 overflow-auto p-8">{children}</main>
  </div>
);
