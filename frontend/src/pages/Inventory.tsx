import { useEffect, useState } from "react";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Edit,
  History,
  MapPin,
  Plus,
  Search,
  Package,
  X,
} from "lucide-react";

import api from "../services/api";


type Status = "ACTIVE" | "INACTIVE";

type Product = {
  id: number;
  hsn_code: string;
  name: string;
  grade: string | null;
  pieces_per_box: number;
};

type Location = {
  id: number;
  code: string;
  name: string;
  description: string;
  status: Status;
};

type Transaction = {
  id: number;

  product: number;
  product_name: string;
  product_hsn: string;

  location: number;
  location_name: string;
  location_code: string;

  transaction_type: string;
  transaction_type_display: string;

  quantity: string;

  reference_number: string;
  transaction_date: string;
  notes: string;
};


type LocationForm = {
  code: string;
  name: string;
  description: string;
  status: Status;
};


type TransactionForm = {
  product: number | "";
  location: number | "";
  transaction_type: string;
  quantity: number;
  reference_number: string;
  transaction_date: string;
  notes: string;
};


const emptyLocationForm: LocationForm = {
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
};


const emptyTransactionForm: TransactionForm = {
  product: "",
  location: "",
  transaction_type: "OPENING",
  quantity: 0,
  reference_number: "",
  transaction_date:
    new Date().toISOString().split("T")[0],
  notes: "",
};


const transactionTypes = [
  {
    value: "OPENING",
    label: "Opening Stock",
    direction: "IN",
  },
  {
    value: "PURCHASE",
    label: "Purchase",
    direction: "IN",
  },
  {
    value: "SALE",
    label: "Sale",
    direction: "OUT",
  },
  {
    value: "STOCK_IN",
    label: "Stock In",
    direction: "IN",
  },
  {
    value: "STOCK_OUT",
    label: "Stock Out",
    direction: "OUT",
  },
  {
    value: "TRANSFER_IN",
    label: "Transfer In",
    direction: "IN",
  },
  {
    value: "TRANSFER_OUT",
    label: "Transfer Out",
    direction: "OUT",
  },
  {
    value: "ADJUSTMENT_IN",
    label: "Adjustment In",
    direction: "IN",
  },
  {
    value: "ADJUSTMENT_OUT",
    label: "Adjustment Out",
    direction: "OUT",
  },
];


export default function Inventory() {

  const [activeTab, setActiveTab] =
    useState<"stock" | "locations" | "transactions">(
      "stock"
    );


  const [products, setProducts] =
    useState<Product[]>([]);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);


  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const [search, setSearch] =
    useState("");


  const [showLocationModal, setShowLocationModal] =
    useState(false);

  const [showTransactionModal, setShowTransactionModal] =
    useState(false);


  const [editingLocation, setEditingLocation] =
    useState<Location | null>(null);


  const [locationForm, setLocationForm] =
    useState<LocationForm>(
      emptyLocationForm
    );


  const [transactionForm, setTransactionForm] =
    useState<TransactionForm>(
      emptyTransactionForm
    );


  const [saving, setSaving] =
    useState(false);


  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const fetchProducts = async () => {

    const response = await api.get(
      "/products/"
    );

    setProducts(
      response.data.results || []
    );
  };


  // =========================================================
  // LOAD LOCATIONS
  // =========================================================

  const fetchLocations = async () => {

    const response = await api.get(
      "/inventory/locations/"
    );

    setLocations(
      response.data.results || []
    );
  };


  // =========================================================
  // LOAD TRANSACTIONS
  // =========================================================

  const fetchTransactions = async () => {

    const response = await api.get(
      "/inventory/transactions/",
      {
        params: search
          ? { search }
          : {},
      }
    );

    setTransactions(
      response.data.results || []
    );
  };


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    const load = async () => {

      try {

        setLoading(true);
        setError("");

        await Promise.all([
          fetchProducts(),
          fetchLocations(),
          fetchTransactions(),
        ]);

      } catch (err) {

        console.error(err);

        setError(
          "Unable to load inventory data."
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);


  // =========================================================
  // SEARCH
  // =========================================================

  useEffect(() => {

    const timer = setTimeout(
      () => {

        fetchTransactions()
          .catch(console.error);

      },
      300
    );

    return () =>
      clearTimeout(timer);

  }, [search]);


  // =========================================================
  // SAVE LOCATION
  // =========================================================

  const saveLocation = async (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setError("");


    if (!locationForm.code.trim()) {

      setError(
        "Location code is required."
      );

      return;
    }


    if (!locationForm.name.trim()) {

      setError(
        "Location name is required."
      );

      return;
    }


    try {

      setSaving(true);


      if (editingLocation) {

        await api.put(
          `/inventory/locations/${editingLocation.id}/`,
          locationForm
        );

      } else {

        await api.post(
          "/inventory/locations/",
          locationForm
        );
      }


      setShowLocationModal(false);

      setEditingLocation(null);

      setLocationForm(
        emptyLocationForm
      );

      await fetchLocations();

    } catch (err: any) {

      console.error(err);

      setError(
        extractError(err)
      );

    } finally {

      setSaving(false);

    }
  };


  // =========================================================
  // SAVE TRANSACTION
  // =========================================================

  const saveTransaction = async (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setError("");


    if (!transactionForm.product) {

      setError(
        "Please select a product."
      );

      return;
    }


    if (!transactionForm.location) {

      setError(
        "Please select a location."
      );

      return;
    }


    if (
      transactionForm.quantity <= 0
    ) {

      setError(
        "Quantity must be greater than zero."
      );

      return;
    }


    try {

      setSaving(true);


      await api.post(
        "/inventory/transactions/",
        {
          ...transactionForm,

          product: Number(
            transactionForm.product
          ),

          location: Number(
            transactionForm.location
          ),
        }
      );


      setShowTransactionModal(
        false
      );

      setTransactionForm(
        emptyTransactionForm
      );


      await fetchTransactions();

    } catch (err: any) {

      console.error(err);

      setError(
        extractError(err)
      );

    } finally {

      setSaving(false);

    }
  };


  // =========================================================
  // EDIT LOCATION
  // =========================================================

  const openEditLocation = (
    location: Location
  ) => {

    setEditingLocation(
      location
    );

    setLocationForm({
      code: location.code,
      name: location.name,
      description:
        location.description || "",
      status: location.status,
    });

    setError("");

    setShowLocationModal(
      true
    );
  };


  // =========================================================
  // CURRENT STOCK
  // =========================================================

  type StockBalance = {
    product: number;
    product_name: string;
    product_hsn: string;
    location: number;
    location_name: string;
    opening: string;
    purchases: string;
    sales: string;
    stock_in: string;
    stock_out: string;
    adjustment_in: string;
    adjustment_out: string;
    current_stock: string;
  };

  const [stockBalances, setStockBalances] =
    useState<StockBalance[]>([]);

  const fetchStock = async () => {
    const response = await api.get(
      "/inventory/stock/",
      {
        params: search
          ? { search }
          : {},
      }
    );

    setStockBalances(
      response.data.results || []
    );
  };

  useEffect(() => {
    fetchStock().catch(error => {
      console.error(error);
      setError(
        "Unable to load current stock."
      );
    });
  }, [search]);

  const stockRows = stockBalances;

  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage stock, locations and stock movements.
          </p>

        </div>


        <button
          onClick={() => {

            setError("");

            if (
              activeTab === "locations"
            ) {

              setEditingLocation(
                null
              );

              setLocationForm(
                emptyLocationForm
              );

              setShowLocationModal(
                true
              );

            } else {

              setTransactionForm(
                emptyTransactionForm
              );

              setShowTransactionModal(
                true
              );

            }

          }}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >

          <Plus size={18} />

          {activeTab === "locations"
            ? "Add Location"
            : "Stock Transaction"}

        </button>

      </div>


      {/* ERROR */}

      {error && (

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>

      )}


      {/* TABS */}

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">

        <TabButton
          active={
            activeTab === "stock"
          }
          onClick={() =>
            setActiveTab("stock")
          }
          icon={
            <Package size={17} />
          }
        >
          Current Stock
        </TabButton>


        <TabButton
          active={
            activeTab === "locations"
          }
          onClick={() =>
            setActiveTab("locations")
          }
          icon={
            <MapPin size={17} />
          }
        >
          Locations
        </TabButton>


        <TabButton
          active={
            activeTab === "transactions"
          }
          onClick={() =>
            setActiveTab(
              "transactions"
            )
          }
          icon={
            <History size={17} />
          }
        >
          Transactions
        </TabButton>

      </div>


      {/* =====================================================
          CURRENT STOCK
      ====================================================== */}

      {activeTab === "stock" && (

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 px-6 py-4">

            <h2 className="font-semibold text-slate-900">
              Current Stock
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Calculated from stock transactions.
            </p>

          </div>


          {loading ? (

            <Loading />

          ) : stockRows.length === 0 ? (

            <EmptyState
              icon={
                <Package size={42} />
              }
              text="No stock available."
            />

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                  <tr>

                    <th className="px-6 py-3">
                      HSN
                    </th>

                    <th className="px-6 py-3">
                      Product / Location
                    </th>

                    <th className="px-6 py-3">
                      Opening
                    </th>

                    <th className="px-6 py-3">
                      Purchases
                    </th>

                    <th className="px-6 py-3">
                      Sales
                    </th>

                    <th className="px-6 py-3">
                      Current Stock
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">

                  {stockRows.map(
                    row => (

                      <tr
                        key={`${row.product}-${row.location}`}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-6 py-4">
                          {row.product_hsn}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div>
                            {row.product_name}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {row.location_name}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {row.opening}
                        </td>

                        <td className="px-6 py-4">
                          {row.purchases}
                        </td>

                        <td className="px-6 py-4">
                          {row.sales}
                        </td>

                        <td
                          className={`px-6 py-4 font-semibold ${
                            Number(row.current_stock) < 0
                              ? "text-red-600"
                              : "text-slate-900"
                          }`}
                        >
                          {row.current_stock}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          LOCATIONS
      ====================================================== */}

      {activeTab === "locations" && (

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 px-6 py-4">

            <h2 className="font-semibold text-slate-900">
              Stock Locations
            </h2>

          </div>


          {loading ? (

            <Loading />

          ) : locations.length === 0 ? (

            <EmptyState
              icon={
                <MapPin size={42} />
              }
              text="No stock locations found."
            />

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                  <tr>

                    <th className="px-6 py-3">
                      Code
                    </th>

                    <th className="px-6 py-3">
                      Location
                    </th>

                    <th className="px-6 py-3">
                      Description
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

                  {locations.map(
                    location => (

                      <tr
                        key={
                          location.id
                        }
                        className="hover:bg-slate-50"
                      >

                        <td className="px-6 py-4 font-medium">
                          {location.code}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900">
                          {location.name}
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {location.description || "-"}
                        </td>

                        <td className="px-6 py-4">

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                            {location.status}
                          </span>

                        </td>

                        <td className="px-6 py-4">

                          <button
                            onClick={() =>
                              openEditLocation(
                                location
                              )
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
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

      )}


      {/* =====================================================
          TRANSACTIONS
      ====================================================== */}

      {activeTab === "transactions" && (

        <div className="space-y-4">

          <div className="rounded-xl border border-slate-200 bg-white p-4">

            <div className="relative max-w-md">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={e =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search product, HSN, location or reference..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

            </div>

          </div>


          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

            {loading ? (

              <Loading />

            ) : transactions.length === 0 ? (

              <EmptyState
                icon={
                  <History size={42} />
                }
                text="No stock transactions found."
              />

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                    <tr>

                      <th className="px-6 py-3">
                        Date
                      </th>

                      <th className="px-6 py-3">
                        Product
                      </th>

                      <th className="px-6 py-3">
                        Location
                      </th>

                      <th className="px-6 py-3">
                        Transaction
                      </th>

                      <th className="px-6 py-3">
                        Quantity
                      </th>

                      <th className="px-6 py-3">
                        Reference
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-100">

                    {transactions.map(
                      transaction => {

                        const movement =
                          transactionTypes.find(
                            item =>
                              item.value ===
                              transaction.transaction_type
                          );


                        const isOut =
                          movement?.direction ===
                          "OUT";


                        return (

                          <tr
                            key={
                              transaction.id
                            }
                            className="hover:bg-slate-50"
                          >

                            <td className="px-6 py-4">
                              {
                                transaction.transaction_date
                              }
                            </td>


                            <td className="px-6 py-4">

                              <div className="font-medium text-slate-900">
                                {
                                  transaction.product_name
                                }
                              </div>

                              <div className="text-xs text-slate-400">
                                {
                                  transaction.product_hsn
                                }
                              </div>

                            </td>


                            <td className="px-6 py-4">

                              {
                                transaction.location_name
                              }

                            </td>


                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                                  isOut
                                    ? "bg-red-50 text-red-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >

                                {isOut
                                  ? (
                                    <ArrowDownToLine
                                      size={13}
                                    />
                                  )
                                  : (
                                    <ArrowUpFromLine
                                      size={13}
                                    />
                                  )}

                                {
                                  transaction.transaction_type_display
                                }

                              </span>

                            </td>


                            <td className="px-6 py-4 font-semibold">

                              {isOut
                                ? "-"
                                : "+"}

                              {
                                transaction.quantity
                              }

                            </td>


                            <td className="px-6 py-4 text-slate-500">

                              {
                                transaction.reference_number ||
                                "-"
                              }

                            </td>

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

      )}


      {/* =====================================================
          LOCATION MODAL
      ====================================================== */}

      {showLocationModal && (

        <Modal
          title={
            editingLocation
              ? "Edit Location"
              : "Add Location"
          }
          onClose={() => {

            if (saving) return;

            setShowLocationModal(
              false
            );

          }}
        >

          <form
            onSubmit={saveLocation}
            className="space-y-5"
          >

            <FormField
              label="Location Code"
              required
            >

              <input
                required
                value={
                  locationForm.code
                }
                onChange={e =>
                  setLocationForm(
                    previous => ({
                      ...previous,
                      code:
                        e.target.value,
                    })
                  )
                }
                className={inputClass}
              />

            </FormField>


            <FormField
              label="Location Name"
              required
            >

              <input
                required
                value={
                  locationForm.name
                }
                onChange={e =>
                  setLocationForm(
                    previous => ({
                      ...previous,
                      name:
                        e.target.value,
                    })
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
                  locationForm.description
                }
                onChange={e =>
                  setLocationForm(
                    previous => ({
                      ...previous,
                      description:
                        e.target.value,
                    })
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
                  locationForm.status
                }
                onChange={e =>
                  setLocationForm(
                    previous => ({
                      ...previous,
                      status:
                        e.target.value as Status,
                    })
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


            <ModalActions
              saving={saving}
              onCancel={() =>
                setShowLocationModal(
                  false
                )
              }
              submitText={
                editingLocation
                  ? "Update Location"
                  : "Create Location"
              }
            />

          </form>

        </Modal>

      )}


      {/* =====================================================
          TRANSACTION MODAL
      ====================================================== */}

      {showTransactionModal && (

        <Modal
          title="Stock Transaction"
          onClose={() => {

            if (saving) return;

            setShowTransactionModal(
              false
            );

          }}
        >

          <form
            onSubmit={saveTransaction}
            className="space-y-5"
          >

            <FormField
              label="Product"
              required
            >

              <select
                required
                value={
                  transactionForm.product
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      product:
                        e.target.value
                          ? Number(
                              e.target.value
                            )
                          : "",
                    })
                  )
                }
                className={inputClass}
              >

                <option value="">
                  Select Product
                </option>

                {products.map(
                  product => (

                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {product.hsn_code} -{" "}
                      {product.name}
                    </option>

                  )
                )}

              </select>

            </FormField>


            <FormField
              label="Location"
              required
            >

              <select
                required
                value={
                  transactionForm.location
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      location:
                        e.target.value
                          ? Number(
                              e.target.value
                            )
                          : "",
                    })
                  )
                }
                className={inputClass}
              >

                <option value="">
                  Select Location
                </option>

                {locations
                  .filter(
                    location =>
                      location.status ===
                      "ACTIVE"
                  )
                  .map(
                    location => (

                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {location.code} -{" "}
                        {location.name}
                      </option>

                    )
                  )}

              </select>

            </FormField>


            <FormField
              label="Transaction Type"
              required
            >

              <select
                required
                value={
                  transactionForm.transaction_type
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      transaction_type:
                        e.target.value,
                    })
                  )
                }
                className={inputClass}
              >

                {transactionTypes.map(
                  type => (

                    <option
                      key={
                        type.value
                      }
                      value={
                        type.value
                      }
                    >
                      {type.label}
                    </option>

                  )
                )}

              </select>

            </FormField>


            <FormField
              label="Quantity"
              required
            >

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={
                  transactionForm.quantity
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      quantity:
                        Number(
                          e.target.value
                        ),
                    })
                  )
                }
                className={inputClass}
              />

            </FormField>


            <FormField
              label="Transaction Date"
              required
            >

              <input
                required
                type="date"
                value={
                  transactionForm.transaction_date
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      transaction_date:
                        e.target.value,
                    })
                  )
                }
                className={inputClass}
              />

            </FormField>


            <FormField
              label="Reference Number"
            >

              <input
                value={
                  transactionForm.reference_number
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      reference_number:
                        e.target.value,
                    })
                  )
                }
                placeholder="Invoice / PO / adjustment reference"
                className={inputClass}
              />

            </FormField>


            <FormField
              label="Notes"
            >

              <textarea
                rows={3}
                value={
                  transactionForm.notes
                }
                onChange={e =>
                  setTransactionForm(
                    previous => ({
                      ...previous,
                      notes:
                        e.target.value,
                    })
                  )
                }
                className={inputClass}
              />

            </FormField>


            <ModalActions
              saving={saving}
              onCancel={() =>
                setShowTransactionModal(
                  false
                )
              }
              submitText="Save Transaction"
            />

          </form>

        </Modal>

      )}

    </div>
  );
}


// =============================================================
// HELPERS
// =============================================================

function extractError(
  error: any
): string {

  const data =
    error?.response?.data;

  if (!data) {
    return "Something went wrong.";
  }

  if (typeof data === "string") {
    return data;
  }

  return Object.entries(data)
    .map(
      ([field, message]) =>
        `${field}: ${
          Array.isArray(message)
            ? message.join(", ")
            : message
        }`
    )
    .join(" | ");
}


function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {

  return (

    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {icon}
      {children}
    </button>

  );
}


function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
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


function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <h2 className="font-semibold text-slate-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >

            <X size={19} />

          </button>

        </div>

        <div className="p-6">

          {children}

        </div>

      </div>

    </div>

  );
}


function ModalActions({
  saving,
  onCancel,
  submitText,
}: {
  saving: boolean;
  onCancel: () => void;
  submitText: string;
}) {

  return (

    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >

        {saving
          ? "Saving..."
          : submitText}

      </button>

    </div>

  );
}


function Loading() {

  return (

    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
      Loading...
    </div>

  );
}


function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {

  return (

    <div className="flex h-56 flex-col items-center justify-center text-slate-400">

      {icon}

      <p className="mt-3">
        {text}
      </p>

    </div>

  );
}


const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
