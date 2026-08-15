import {
  Bell,
  Menu,
  Search,
  UserCircle,
} from "lucide-react";


interface TopbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
}


export default function Topbar({
  onMenuClick,
  onLogout,
}: TopbarProps) {

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">

      {/* Left */}

      <div className="flex items-center gap-3">

        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">

          <Search
            size={17}
            className="text-slate-400"
          />

          <input
            type="text"
            placeholder="Search..."
            className="w-64 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />

        </div>

      </div>


      {/* Right */}

      <div className="flex items-center gap-2">

        <button
          className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
        >
          <Bell size={19} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>


        <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-3">

          <UserCircle
            size={30}
            className="text-slate-400"
          />

          <div className="hidden sm:block">

            <div className="text-sm font-semibold text-slate-800">
              Admin
            </div>

            <div className="text-xs text-slate-500">
              Administrator
            </div>

          </div>


          <button
            onClick={onLogout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>

        </div>

      </div>

    </header>
  );
}