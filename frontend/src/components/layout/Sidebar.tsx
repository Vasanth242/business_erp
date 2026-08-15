import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Snowflake,
  Tags,
  Truck,
  Users,
  X,
} from "lucide-react";

import { NavLink } from "react-router-dom";


interface SidebarProps {
  open: boolean;
  onClose: () => void;
}


const navigation = [
  {
    section: "Overview",
    items: [
      {
        name: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    section: "Business",
    items: [
      {
        name: "Sales",
        path: "/sales",
        icon: Receipt,
      },
      {
        name: "Customers",
        path: "/customers",
        icon: Users,
      },
      {
        name: "Inventory",
        path: "/inventory",
        icon: Boxes,
      },
      {
        name: "Products",
        path: "/products",
        icon: Package,
      },
      {
        name: "Purchases",
        path: "/purchases",
        icon: Truck,
      },
      {
        name: "Payments",
        path: "/payments",
        icon: CircleDollarSign,
      },
    ],
  },

  {
    section: "Operations",
    items: [
      {
        name: "Expenses",
        path: "/expenses",
        icon: ClipboardList,
      },
      {
        name: "Expense Categories",
        path: "/expense-categories",
        icon: Tags,
      },
      {
        name: "Freezers",
        path: "/freezers",
        icon: Snowflake,
      },
      {
        name: "Claims",
        path: "/claims",
        icon: FileText,
      },
      {
        name: "Reconciliation",
        path: "/reconciliation",
        icon: BarChart3,
      },
    ],
  },
];


export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          flex w-64 flex-col
          border-r border-slate-200
          bg-white
          transition-transform duration-200
          lg:static lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >

        {/* Logo */}

        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">

          <div>
            <div className="text-lg font-bold text-slate-900">
              Business ERP
            </div>

            <div className="text-xs text-slate-500">
              Management System
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>

        </div>


        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto px-3 py-5">

          {navigation.map((group) => (

            <div
              key={group.section}
              className="mb-7"
            >

              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.section}
              </div>

              <div className="space-y-1">

                {group.items.map((item) => {

                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `
                        flex items-center gap-3 rounded-lg
                        px-3 py-2.5 text-sm font-medium
                        transition
                        ${
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }
                        `
                      }
                    >
                      <Icon size={18} />

                      <span>
                        {item.name}
                      </span>

                    </NavLink>
                  );

                })}

              </div>

            </div>

          ))}

        </nav>


        {/* Status */}

        <div className="border-t border-slate-200 p-4">

          <div className="rounded-xl bg-slate-50 p-3">

            <div className="text-xs font-medium text-slate-500">
              System Status
            </div>

            <div className="mt-2 flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-sm font-medium text-slate-700">
                System Online
              </span>

            </div>

          </div>

        </div>

      </aside>
    </>
  );
}