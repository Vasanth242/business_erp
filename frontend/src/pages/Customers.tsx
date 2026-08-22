import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CreditCard,
  Edit,
  Eye,
  IndianRupee,
  MapPin,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";

import Modal from "../components/common/Modal";


// ============================================================
// TYPES
// ============================================================

type Status = "ACTIVE" | "INACTIVE";

type CustomerType =
  | "RETAIL"
  | "VAN"
  | "WHOLESALE"
  | "COUNTER"
  | "OTHER";

interface Route {
  id: number;
  code: string;
  name: string;
  description: string;
  status: Status;
  customer_count: number;

  created_at: string;
  created_by_name: string | null;

  updated_at: string;
  updated_by_name: string | null;
}

interface Customer {
  id: number;

  code: string;
  shop_name: string;
  contact_person: string;

  mobile: string;
  alternate_mobile: string;

  address: string;

  route: number;
  route_name: string;

  customer_type: CustomerType;

  credit_limit: string;
  opening_balance: string;

  notes: string;

  status: Status;

  created_at: string;
  created_by_name: string | null;

  updated_at: string;
  updated_by_name: string | null;
}

interface OutstandingInvoice {
  sale_id: number;
  invoice_number: string;
  sale_date: string;
  total_amount: string | number;
  paid_amount: string | number;
  outstanding_amount: string | number;
  payment_status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
}

interface CustomerOutstanding {
  customer: {
    id: number;
    code: string;
    shop_name: string;
    mobile: string;
    status: Status;
  };
  summary: {
    total_sales: string | number;
    total_paid: string | number;
    invoice_outstanding: string | number;
    opening_balance: string | number;
    total_outstanding: string | number;
  };
  invoices: OutstandingInvoice[];
}

interface RouteForm {
  code: string;
  name: string;
  description: string;
  status: Status;
}

interface CustomerForm {
  code: string;
  shop_name: string;
  contact_person: string;
  mobile: string;
  alternate_mobile: string;
  address: string;
  route: number | "";
  customer_type: CustomerType;
  credit_limit: number;
  opening_balance: number;
  notes: string;
  status: Status;
}


// ============================================================
// DEFAULT FORMS
// ============================================================

const emptyRouteForm: RouteForm = {
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
};

const emptyCustomerForm: CustomerForm = {
  code: "",
  shop_name: "",
  contact_person: "",
  mobile: "",
  alternate_mobile: "",
  address: "",
  route: "",
  customer_type: "RETAIL",
  credit_limit: 0,
  opening_balance: 0,
  notes: "",
  status: "ACTIVE",
};


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Customers() {

  const [activeTab, setActiveTab] =
    useState<"customers" | "routes">("customers");


  // ----------------------------------------------------------
  // Customer state
  // ----------------------------------------------------------

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [customerLoading, setCustomerLoading] =
    useState(true);

  const [customerSaving, setCustomerSaving] =
    useState(false);

  const [customerError, setCustomerError] =
    useState("");

  const [showCustomerModal, setShowCustomerModal] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [customerForm, setCustomerForm] =
    useState<CustomerForm>(emptyCustomerForm);


  // ----------------------------------------------------------
  // Customer outstanding state
  // ----------------------------------------------------------

  const [showOutstandingModal, setShowOutstandingModal] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [customerOutstanding, setCustomerOutstanding] =
    useState<CustomerOutstanding | null>(null);

  const [outstandingLoading, setOutstandingLoading] =
    useState(false);

  const [outstandingError, setOutstandingError] =
    useState("");


  // ----------------------------------------------------------
  // Route state
  // ----------------------------------------------------------

  const [routes, setRoutes] =
    useState<Route[]>([]);

  const [routeSearch, setRouteSearch] =
    useState("");

  const [routeLoading, setRouteLoading] =
    useState(true);

  const [routeSaving, setRouteSaving] =
    useState(false);

  const [routeError, setRouteError] =
    useState("");

  const [showRouteModal, setShowRouteModal] =
    useState(false);

  const [editingRoute, setEditingRoute] =
    useState<Route | null>(null);

  const [routeForm, setRouteForm] =
    useState<RouteForm>(emptyRouteForm);


  // ==========================================================
  // LOAD ROUTES
  // ==========================================================

  const fetchRoutes = async () => {

    try {

      setRouteLoading(true);
      setRouteError("");

      const response = await api.get(
        "/routes/",
        {
          params: routeSearch
            ? { search: routeSearch }
            : {},
        }
      );

      setRoutes(
        response.data.results || []
      );

    } catch (error) {

      console.error(error);

      setRouteError(
        "Unable to load routes."
      );

    } finally {

      setRouteLoading(false);

    }
  };


  // ==========================================================
  // LOAD CUSTOMERS
  // ==========================================================

  const fetchCustomers = async () => {

    try {

      setCustomerLoading(true);
      setCustomerError("");

      const response = await api.get(
        "/customers/",
        {
          params: customerSearch
            ? { search: customerSearch }
            : {},
        }
      );

      setCustomers(
        response.data.results || []
      );

    } catch (error) {

      console.error(error);

      setCustomerError(
        "Unable to load customers."
      );

    } finally {

      setCustomerLoading(false);

    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    fetchRoutes();

  }, []);


  useEffect(() => {

    fetchCustomers();

  }, []);


  // ==========================================================
  // SEARCH - CUSTOMERS
  // ==========================================================

  useEffect(() => {

    const timer = setTimeout(
      () => {
        fetchCustomers();
      },
      300
    );

    return () =>
      clearTimeout(timer);

  }, [customerSearch]);


  // ==========================================================
  // SEARCH - ROUTES
  // ==========================================================

  useEffect(() => {

    const timer = setTimeout(
      () => {
        fetchRoutes();
      },
      300
    );

    return () =>
      clearTimeout(timer);

  }, [routeSearch]);


  // ==========================================================
  // CUSTOMER FORM
  // ==========================================================

  const updateCustomerField = <
    K extends keyof CustomerForm
  >(
    field: K,
    value: CustomerForm[K]
  ) => {

    setCustomerForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  };


  const openCreateCustomer = () => {

    setEditingCustomer(null);

    setCustomerForm(
      emptyCustomerForm
    );

    setCustomerError("");

    setShowCustomerModal(true);
  };


  const openEditCustomer = (
    customer: Customer
  ) => {

    setEditingCustomer(customer);

    setCustomerForm({
      code: customer.code,
      shop_name: customer.shop_name,
      contact_person:
        customer.contact_person || "",
      mobile: customer.mobile || "",
      alternate_mobile:
        customer.alternate_mobile || "",
      address: customer.address || "",
      route: customer.route,
      customer_type:
        customer.customer_type,
      credit_limit:
        Number(customer.credit_limit),
      opening_balance:
        Number(customer.opening_balance),
      notes: customer.notes || "",
      status: customer.status,
    });

    setCustomerError("");

    setShowCustomerModal(true);
  };


  const closeCustomerModal = () => {

    if (customerSaving) {
      return;
    }

    setShowCustomerModal(false);

    setEditingCustomer(null);

    setCustomerForm(
      emptyCustomerForm
    );

    setCustomerError("");
  };


  // ==========================================================
  // CUSTOMER VALIDATION
  // ==========================================================

  const validateCustomer = (): boolean => {

    if (!customerForm.code.trim()) {

      setCustomerError(
        "Customer code is required."
      );

      return false;
    }


    if (!customerForm.shop_name.trim()) {

      setCustomerError(
        "Shop name is required."
      );

      return false;
    }


    if (!customerForm.route) {

      setCustomerError(
        "Please select a route."
      );

      return false;
    }


    if (
      customerForm.credit_limit < 0
    ) {

      setCustomerError(
        "Credit limit cannot be negative."
      );

      return false;
    }


    if (
      customerForm.opening_balance < 0
    ) {

      setCustomerError(
        "Opening balance cannot be negative."
      );

      return false;
    }


    if (
      customerForm.mobile &&
      !/^\d{7,15}$/.test(
        customerForm.mobile
      )
    ) {

      setCustomerError(
        "Mobile number must contain 7 to 15 digits."
      );

      return false;
    }


    if (
      customerForm.alternate_mobile &&
      !/^\d{7,15}$/.test(
        customerForm.alternate_mobile
      )
    ) {

      setCustomerError(
        "Alternate mobile number must contain 7 to 15 digits."
      );

      return false;
    }


    return true;
  };


  // ==========================================================
  // SAVE CUSTOMER
  // ==========================================================

  const saveCustomer = async (
    event: FormEvent
  ) => {

    event.preventDefault();

    setCustomerError("");

    if (!validateCustomer()) {
      return;
    }


    try {

      setCustomerSaving(true);

      const payload = {
        ...customerForm,
        route: Number(
          customerForm.route
        ),
      };


      if (editingCustomer) {

        await api.put(
          `/customers/${editingCustomer.id}/`,
          payload
        );

      } else {

        await api.post(
          "/customers/",
          payload
        );
      }


      closeCustomerModal();

      await fetchCustomers();

      await fetchRoutes();

    } catch (error: any) {

      console.error(error);

      const data =
        error?.response?.data;

      if (data) {

        setCustomerError(
          Object.entries(data)
            .map(
              ([field, message]) =>
                `${field}: ${
                  Array.isArray(message)
                    ? message.join(", ")
                    : message
                }`
            )
            .join(" | ")
        );

      } else {

        setCustomerError(
          "Unable to save customer."
        );
      }

    } finally {

      setCustomerSaving(false);
    }
  };


  // ==========================================================
  // DEACTIVATE CUSTOMER
  // ==========================================================

  const deactivateCustomer = async (
    customer: Customer
  ) => {

    if (customer.status === "INACTIVE") {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${customer.shop_name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {

      setCustomerError("");

      await api.delete(
        `/customers/${customer.id}/`
      );

      await fetchCustomers();
      await fetchRoutes();

    } catch (error: any) {

      console.error(error);

      const data =
        error?.response?.data;

      if (data?.detail) {

        setCustomerError(
          data.detail
        );

      } else {

        setCustomerError(
          "Unable to deactivate customer."
        );
      }
    }
  };


  // ==========================================================
  // CUSTOMER OUTSTANDING
  // ==========================================================

  const openCustomerOutstanding = async (
    customer: Customer
  ) => {
    setSelectedCustomer(customer);
    setCustomerOutstanding(null);
    setOutstandingError("");
    setShowOutstandingModal(true);
    setOutstandingLoading(true);

    try {
      const response = await api.get(
        `/customers/${customer.id}/outstanding/`
      );

      setCustomerOutstanding(response.data);
    } catch (error) {
      console.error(error);
      setOutstandingError(
        "Unable to load customer outstanding details."
      );
    } finally {
      setOutstandingLoading(false);
    }
  };

  const closeCustomerOutstanding = () => {
    if (outstandingLoading) {
      return;
    }

    setShowOutstandingModal(false);
    setSelectedCustomer(null);
    setCustomerOutstanding(null);
    setOutstandingError("");
  };

  // ==========================================================
  // ROUTE FORM
  // ==========================================================

  const updateRouteField = <
    K extends keyof RouteForm
  >(
    field: K,
    value: RouteForm[K]
  ) => {

    setRouteForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  };


  const openCreateRoute = () => {

    setEditingRoute(null);

    setRouteForm(
      emptyRouteForm
    );

    setRouteError("");

    setShowRouteModal(true);
  };


  const openEditRoute = (
    route: Route
  ) => {

    setEditingRoute(route);

    setRouteForm({
      code: route.code,
      name: route.name,
      description:
        route.description || "",
      status: route.status,
    });

    setRouteError("");

    setShowRouteModal(true);
  };


  const closeRouteModal = () => {

    if (routeSaving) {
      return;
    }

    setShowRouteModal(false);

    setEditingRoute(null);

    setRouteForm(
      emptyRouteForm
    );

    setRouteError("");
  };


  // ==========================================================
  // SAVE ROUTE
  // ==========================================================

  const saveRoute = async (
    event: FormEvent
  ) => {

    event.preventDefault();

    setRouteError("");


    if (!routeForm.code.trim()) {

      setRouteError(
        "Route code is required."
      );

      return;
    }


    if (!routeForm.name.trim()) {

      setRouteError(
        "Route name is required."
      );

      return;
    }


    try {

      setRouteSaving(true);


      if (editingRoute) {

        await api.put(
          `/routes/${editingRoute.id}/`,
          routeForm
        );

      } else {

        await api.post(
          "/routes/",
          routeForm
        );
      }


      closeRouteModal();

      await fetchRoutes();

    } catch (error: any) {

      console.error(error);

      const data =
        error?.response?.data;

      if (data) {

        setRouteError(
          Object.entries(data)
            .map(
              ([field, message]) =>
                `${field}: ${
                  Array.isArray(message)
                    ? message.join(", ")
                    : message
                }`
            )
            .join(" | ")
        );

      } else {

        setRouteError(
          "Unable to save route."
        );
      }

    } finally {

      setRouteSaving(false);
    }
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Customers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage customers, shops and delivery routes.
          </p>

        </div>


        <button
          onClick={
            activeTab === "customers"
              ? openCreateCustomer
              : openCreateRoute
          }
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >

          <Plus size={18} />

          {activeTab === "customers"
            ? "Add Customer"
            : "Add Route"}

        </button>

      </div>


      {/* =====================================================
          TABS
      ====================================================== */}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">

        <button
          onClick={() =>
            setActiveTab("customers")
          }
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition ${
            activeTab === "customers"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >

          <Users size={17} />

          Customers

        </button>


        <button
          onClick={() =>
            setActiveTab("routes")
          }
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition ${
            activeTab === "routes"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >

          <MapPin size={17} />

          Routes

        </button>

      </div>


      {/* =====================================================
          CUSTOMER TAB
      ====================================================== */}

      {activeTab === "customers" && (

        <div className="space-y-5">

          {/* Search */}

          <div className="rounded-xl border border-slate-200 bg-white p-4">

            <div className="relative max-w-md">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={customerSearch}
                onChange={event =>
                  setCustomerSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, shop, mobile or route..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

            </div>

          </div>


          {customerError && (

            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {customerError}
            </div>

          )}


          {/* Customer table */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-6 py-4">

              <div className="flex items-center gap-2">

                <Users size={18} />

                <h2 className="font-semibold text-slate-900">
                  Customer Master
                </h2>

                <span className="ml-auto text-sm text-slate-400">
                  {customers.length} customers
                </span>

              </div>

            </div>


            {customerLoading ? (

              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Loading customers...
              </div>

            ) : customers.length === 0 ? (

              <div className="flex h-56 flex-col items-center justify-center text-slate-400">

                <Users size={42} />

                <p className="mt-3">
                  No customers found.
                </p>

                <button
                  onClick={
                    openCreateCustomer
                  }
                  className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                >

                  <Plus size={16} />

                  Add Customer

                </button>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                    <tr>

                      <th className="px-6 py-3">
                        Code
                      </th>

                      <th className="px-6 py-3">
                        Shop
                      </th>

                      <th className="px-6 py-3">
                        Contact
                      </th>

                      <th className="px-6 py-3">
                        Mobile
                      </th>

                      <th className="px-6 py-3">
                        Route
                      </th>

                      <th className="px-6 py-3">
                        Type
                      </th>

                      <th className="px-6 py-3">
                        Credit Limit
                      </th>

                      <th className="px-6 py-3">
                        Status
                      </th>

                      <th className="px-6 py-3">
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-100">

                    {customers.map(
                      customer => (

                        <tr
                          key={customer.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-6 py-4 font-medium text-slate-900">
                            {customer.code}
                          </td>


                          <td className="px-6 py-4">

                            <div className="font-medium text-slate-900">
                              {customer.shop_name}
                            </div>

                            {customer.address && (

                              <div className="max-w-xs truncate text-xs text-slate-400">
                                {customer.address}
                              </div>

                            )}

                          </td>


                          <td className="px-6 py-4">
                            {customer.contact_person || "-"}
                          </td>


                          <td className="px-6 py-4">
                            {customer.mobile || "-"}
                          </td>


                          <td className="px-6 py-4">

                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {customer.route_name}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            {customer.customer_type}

                          </td>


                          <td className="px-6 py-4">

                            ₹
                            {Number(
                              customer.credit_limit
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}

                          </td>


                          <td className="px-6 py-4">

                            <span
                              className={
                                customer.status ===
                                "ACTIVE"
                                  ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                                  : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500"
                              }
                            >
                              {customer.status ===
                              "ACTIVE"
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <div className="flex items-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  openCustomerOutstanding(
                                    customer
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                title="View outstanding"
                              >
                                <Eye size={15} />
                                Outstanding
                              </button>

                              <button
                                onClick={() =>
                                  openEditCustomer(
                                    customer
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                title="Edit customer"
                              >

                                <Edit size={17} />

                              </button>

                              {customer.status === "ACTIVE" && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    deactivateCustomer(
                                      customer
                                    )
                                  }
                                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                  title="Deactivate customer"
                                >
                                  Deactivate
                                </button>

                              )}

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

      )}


      {/* =====================================================
          ROUTES TAB
      ====================================================== */}

      {activeTab === "routes" && (

        <div className="space-y-5">

          {/* Search */}

          <div className="rounded-xl border border-slate-200 bg-white p-4">

            <div className="relative max-w-md">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={routeSearch}
                onChange={event =>
                  setRouteSearch(
                    event.target.value
                  )
                }
                placeholder="Search route..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

            </div>

          </div>


          {routeError && (

            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {routeError}
            </div>

          )}


          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-6 py-4">

              <div className="flex items-center gap-2">

                <MapPin size={18} />

                <h2 className="font-semibold text-slate-900">
                  Route Master
                </h2>

                <span className="ml-auto text-sm text-slate-400">
                  {routes.length} routes
                </span>

              </div>

            </div>


            {routeLoading ? (

              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Loading routes...
              </div>

            ) : routes.length === 0 ? (

              <div className="flex h-56 flex-col items-center justify-center text-slate-400">

                <MapPin size={42} />

                <p className="mt-3">
                  No routes found.
                </p>

                <button
                  onClick={
                    openCreateRoute
                  }
                  className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                >

                  <Plus size={16} />

                  Add Route

                </button>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                    <tr>

                      <th className="px-6 py-3">
                        Code
                      </th>

                      <th className="px-6 py-3">
                        Route
                      </th>

                      <th className="px-6 py-3">
                        Description
                      </th>

                      <th className="px-6 py-3">
                        Customers
                      </th>

                      <th className="px-6 py-3">
                        Status
                      </th>

                      <th className="px-6 py-3">
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-100">

                    {routes.map(
                      route => (

                        <tr
                          key={route.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-6 py-4 font-medium">
                            {route.code}
                          </td>


                          <td className="px-6 py-4 font-medium text-slate-900">
                            {route.name}
                          </td>


                          <td className="max-w-sm truncate px-6 py-4 text-slate-500">
                            {route.description || "-"}
                          </td>


                          <td className="px-6 py-4">
                            {route.customer_count}
                          </td>


                          <td className="px-6 py-4">

                            <span
                              className={
                                route.status ===
                                "ACTIVE"
                                  ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                                  : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500"
                              }
                            >
                              {route.status ===
                              "ACTIVE"
                                ? "Active"
                                : "Inactive"}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <button
                              onClick={() =>
                                openEditRoute(
                                  route
                                )
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                              title="Edit route"
                            >

                              <Edit size={17} />

                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

      )}


      {/* =====================================================
          CUSTOMER MODAL
      ====================================================== */}

      <Modal
        open={showCustomerModal}
        onClose={closeCustomerModal}
        title={
          editingCustomer
            ? "Edit Customer"
            : "Add Customer"
        }
        description="Customer master information"
        maxWidth="max-w-3xl"
      >


            <form
              onSubmit={saveCustomer}
              className="space-y-6 p-6"
            >

              {customerError && (

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {customerError}
                </div>

              )}


              {/* Basic Information */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Basic Information
                </h3>


                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <FormField
                    label="Customer Code"
                    required
                  >

                    <input
                      required
                      value={
                        customerForm.code
                      }
                      onChange={e =>
                        updateCustomerField(
                          "code",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <FormField
                    label="Shop Name"
                    required
                  >

                    <input
                      required
                      value={
                        customerForm.shop_name
                      }
                      onChange={e =>
                        updateCustomerField(
                          "shop_name",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <FormField
                    label="Contact Person"
                  >

                    <input
                      value={
                        customerForm.contact_person
                      }
                      onChange={e =>
                        updateCustomerField(
                          "contact_person",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <FormField
                    label="Customer Type"
                  >

                    <select
                      value={
                        customerForm.customer_type
                      }
                      onChange={e =>
                        updateCustomerField(
                          "customer_type",
                          e.target.value as CustomerType
                        )
                      }
                      className={inputClass}
                    >

                      <option value="RETAIL">
                        Retail
                      </option>

                      <option value="VAN">
                        Van
                      </option>

                      <option value="WHOLESALE">
                        Wholesale
                      </option>

                      <option value="COUNTER">
                        Counter
                      </option>

                      <option value="OTHER">
                        Other
                      </option>

                    </select>

                  </FormField>

                </div>

              </section>


              {/* Contact */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Contact & Address
                </h3>


                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <FormField
                    label="Mobile"
                  >

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={15}
                      value={
                        customerForm.mobile
                      }
                      onChange={e =>
                        updateCustomerField(
                          "mobile",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <FormField
                    label="Alternate Mobile"
                  >

                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={15}
                      value={
                        customerForm.alternate_mobile
                      }
                      onChange={e =>
                        updateCustomerField(
                          "alternate_mobile",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <div className="md:col-span-2">

                    <FormField
                      label="Address"
                    >

                      <textarea
                        rows={3}
                        value={
                          customerForm.address
                        }
                        onChange={e =>
                          updateCustomerField(
                            "address",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />

                    </FormField>

                  </div>

                </div>

              </section>


              {/* Business */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Business Information
                </h3>


                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <FormField
                    label="Route"
                    required
                  >

                    <select
                      required
                      value={
                        customerForm.route
                      }
                      onChange={e =>
                        updateCustomerField(
                          "route",
                          e.target.value
                            ? Number(
                                e.target.value
                              )
                            : ""
                        )
                      }
                      className={inputClass}
                    >

                      <option value="">
                        Select Route
                      </option>

                      {routes
                        .filter(
                          route =>
                            route.status ===
                            "ACTIVE"
                        )
                        .map(route => (

                          <option
                            key={route.id}
                            value={route.id}
                          >
                            {route.code} -{" "}
                            {route.name}
                          </option>

                        ))}

                    </select>

                  </FormField>


                  <FormField
                    label="Status"
                  >

                    <select
                      value={
                        customerForm.status
                      }
                      onChange={e =>
                        updateCustomerField(
                          "status",
                          e.target.value as Status
                        )
                      }
                      className={inputClass}
                    >

                      <option value="ACTIVE">
                        Active
                      </option>

                      <option value="INACTIVE">
                        Inactive
                      </option>

                    </select>

                  </FormField>


                  <FormField
                    label="Credit Limit"
                  >

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        customerForm.credit_limit
                      }
                      onChange={e =>
                        updateCustomerField(
                          "credit_limit",
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <FormField
                    label="Opening Balance"
                  >

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        customerForm.opening_balance
                      }
                      onChange={e =>
                        updateCustomerField(
                          "opening_balance",
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className={inputClass}
                    />

                  </FormField>


                  <div className="md:col-span-2">

                    <FormField
                      label="Notes"
                    >

                      <textarea
                        rows={3}
                        value={
                          customerForm.notes
                        }
                        onChange={e =>
                          updateCustomerField(
                            "notes",
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />

                    </FormField>

                  </div>

                </div>

              </section>


              {/* Footer */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={
                    closeCustomerModal
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={customerSaving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {customerSaving
                    ? "Saving..."
                    : editingCustomer
                      ? "Update Customer"
                      : "Create Customer"}

                </button>

              </div>

            </form>
      </Modal>

      {/* =====================================================
          CUSTOMER OUTSTANDING MODAL
      ====================================================== */}

      <Modal
        open={showOutstandingModal}
        onClose={closeCustomerOutstanding}
        maxWidth="max-w-6xl"
      >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <CreditCard size={20} />
                  Customer Outstanding
                </h2>
                {selectedCustomer && (
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedCustomer.shop_name} · {selectedCustomer.code}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeCustomerOutstanding}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {outstandingLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  Loading customer outstanding...
                </div>
              ) : outstandingError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {outstandingError}
                </div>
              ) : customerOutstanding ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <FinancialCard
                      label="Total Sales"
                      value={customerOutstanding.summary.total_sales}
                    />
                    <FinancialCard
                      label="Total Paid"
                      value={customerOutstanding.summary.total_paid}
                    />
                    <FinancialCard
                      label="Invoice Outstanding"
                      value={customerOutstanding.summary.invoice_outstanding}
                    />
                    <FinancialCard
                      label="Opening Balance"
                      value={customerOutstanding.summary.opening_balance}
                    />
                    <FinancialCard
                      label="Total Outstanding"
                      value={customerOutstanding.summary.total_outstanding}
                      emphasis
                    />
                  </div>

                  <section className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Invoice Outstanding
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Completed invoices and their payment status.
                        </p>
                      </div>
                      <span className="text-sm text-slate-400">
                        {customerOutstanding.invoices.length} invoices
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-212.5 text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-5 py-3">Invoice</th>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3 text-right">Total</th>
                            <th className="px-5 py-3 text-right">Paid</th>
                            <th className="px-5 py-3 text-right">Outstanding</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerOutstanding.invoices.map(invoice => (
                            <tr key={invoice.sale_id} className="hover:bg-slate-50">
                              <td className="px-5 py-4 font-medium text-slate-900">
                                {invoice.invoice_number}
                              </td>
                              <td className="px-5 py-4 text-slate-500">
                                {formatDate(invoice.sale_date)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {formatCurrency(invoice.total_amount)}
                              </td>
                              <td className="px-5 py-4 text-right text-emerald-700">
                                {formatCurrency(invoice.paid_amount)}
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-slate-900">
                                {formatCurrency(invoice.outstanding_amount)}
                              </td>
                              <td className="px-5 py-4">
                                <PaymentStatusBadge status={invoice.payment_status} />
                              </td>
                            </tr>
                          ))}

                          {customerOutstanding.invoices.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                                No completed invoices found for this customer.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={closeCustomerOutstanding}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
        </Modal>

      {/* =====================================================
          ROUTE MODAL
      ====================================================== */}

        <Modal
          open={showRouteModal}
          onClose={closeRouteModal}
          title={
            editingRoute
              ? "Edit Route"
              : "Add Route"
          }
          description="Route master information"
          maxWidth="max-w-3xl"
        >


            <form
              onSubmit={saveRoute}
              className="space-y-5 p-6"
            >

              {routeError && (

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {routeError}
                </div>

              )}


              <FormField
                label="Route Code"
                required
              >

                <input
                  required
                  value={
                    routeForm.code
                  }
                  onChange={e =>
                    updateRouteField(
                      "code",
                      e.target.value
                    )
                  }
                  className={inputClass}
                />

              </FormField>


              <FormField
                label="Route Name"
                required
              >

                <input
                  required
                  value={
                    routeForm.name
                  }
                  onChange={e =>
                    updateRouteField(
                      "name",
                      e.target.value
                    )
                  }
                  className={inputClass}
                />

              </FormField>


              <FormField
                label="Description"
              >

                <textarea
                  rows={3}
                  value={
                    routeForm.description
                  }
                  onChange={e =>
                    updateRouteField(
                      "description",
                      e.target.value
                    )
                  }
                  className={inputClass}
                />

              </FormField>


              <FormField
                label="Status"
              >

                <select
                  value={
                    routeForm.status
                  }
                  onChange={e =>
                    updateRouteField(
                      "status",
                      e.target.value as Status
                    )
                  }
                  className={inputClass}
                >

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>

                </select>

              </FormField>


              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={
                    closeRouteModal
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={routeSaving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {routeSaving
                    ? "Saving..."
                    : editingRoute
                      ? "Update Route"
                      : "Create Route"}

                </button>

              </div>

            </form>

        </Modal>

      </div>
  );
}


// ============================================================
// REUSABLE FORM FIELD
// ============================================================

function formatCurrency(value: string | number) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}-${month}-${year}`;
}

function PaymentStatusBadge({
  status,
}: {
  status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
}) {
  const config = {
    PAID: {
      label: "Paid",
      className: "bg-emerald-50 text-emerald-700",
    },
    PARTIALLY_PAID: {
      label: "Partially Paid",
      className: "bg-amber-50 text-amber-700",
    },
    UNPAID: {
      label: "Unpaid",
      className: "bg-red-50 text-red-700",
    },
  }[status];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function FinancialCard({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-xl border border-slate-900 bg-slate-900 p-4 text-white"
          : "rounded-xl border border-slate-200 bg-white p-4"
      }
    >
      <div className="flex items-center gap-2">
        <IndianRupee size={15} />
        <p
          className={
            emphasis
              ? "text-xs font-medium text-slate-300"
              : "text-xs font-medium text-slate-500"
          }
        >
          {label}
        </p>
      </div>
      <p
        className={
          emphasis
            ? "mt-2 text-xl font-bold text-white"
            : "mt-2 text-xl font-bold text-slate-900"
        }
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";


function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {

  return (

    <div>

      <label className="mb-1.5 block text-sm font-medium text-slate-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {children}

    </div>

  );
}
