import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

type Customer = {
  id: number;
  code: string;
  shop_name: string;
  mobile?: string;
  status: string;
};

type Product = {
  id: number;
  hsn_code: string;
  name: string;
  grade?: string;
  purchase_rate_per_piece: string;
  box_purchase_rate: string;
  box_retail_rate: string;
  bill_rate: string;
  retail_rate: string;
  new_retail_rate: string;
  mrp: string;
  status: string;
};

type Location = {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: string;
};

type Stock = {
  product: number;
  product_name: string;
  product_hsn: string;
  location: number;
  location_name: string;
  current_stock: string;
};

type SaleItem = {
  product: number | "";
  quantity: string;
  rate: string;
  discount: string;
};

type Sale = {
  id: number;
  invoice_number: string;
  customer: number;
  customer_name: string;
  sale_date: string;
  location: number;
  location_name: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total_amount: string;
  notes: string;
  items: {
    id: number;
    product: number;
    product_name: string;
    product_hsn: string;
    quantity: string;
    rate: string;
    discount: string;
    amount: string;
  }[];
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const API_BASE = "";

async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const method = (options.method ?? "GET").toUpperCase();

    if (method === "POST") {
      const response = await api.post<T>(
        `${API_BASE}${url}`,
        options.body ? JSON.parse(options.body as string) : undefined,
      );
      return response.data;
    }

    const response = await api.get<T>(
      `${API_BASE}${url}`,
    );
    return response.data;
  } catch (err: any) {
    const data = err?.response?.data;
    let message = "Request failed.";

    if (data?.detail) {
      message = data.detail;
    } else if (data && typeof data === "object") {
      message = Object.entries(data)
        .map(([key, value]) =>
          Array.isArray(value)
            ? `${key}: ${value.join(", ")}`
            : `${key}: ${String(value)}`,
        )
        .join("\n");
    } else if (err instanceof Error) {
      message = err.message;
    }

    throw new Error(message);
  }
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function money(value: string | number) {
  return Number(value || 0).toFixed(2);
}

function createEmptyItem(): SaleItem {
  return {
    product: "",
    quantity: "",
    rate: "",
    discount: "0",
  };
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [customer, setCustomer] = useState<number | "">("");
  const [location, setLocation] = useState<number | "">("");
  const [saleDate, setSaleDate] = useState(today());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<SaleItem[]>([
    createEmptyItem(),
  ]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        salesResponse,
        customersResponse,
        productsResponse,
        locationsResponse,
        stockResponse,
      ] = await Promise.all([
        apiRequest<PaginatedResponse<Sale>>("/sales/"),
        apiRequest<PaginatedResponse<Customer>>("/customers/"),
        apiRequest<PaginatedResponse<Product>>("/products/"),
        apiRequest<PaginatedResponse<Location>>(
          "/inventory/locations/",
        ),
        apiRequest<PaginatedResponse<Stock>>(
          "/inventory/stock/",
        ),
      ]);

      setSales(salesResponse.results);
      setCustomers(customersResponse.results);
      setProducts(productsResponse.results);
      setLocations(locationsResponse.results);
      setStocks(stockResponse.results);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sales data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setCustomer("");
    setLocation("");
    setSaleDate(today());
    setInvoiceNumber("");
    setDiscount("0");
    setTax("0");
    setNotes("");
    setItems([createEmptyItem()]);
    setError("");
  }

  function openNewSale() {
    setError("");
    setSuccess("");

    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  function updateItem(
    index: number,
    field: keyof SaleItem,
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      createEmptyItem(),
    ]);
  }

  function removeItem(index: number) {
    if (items.length === 1) {
      return;
    }

    setItems((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  function selectProduct(
    index: number,
    productId: string,
  ) {
    const id = productId
      ? Number(productId)
      : "";

    updateItem(
      index,
      "product",
      id,
    );

    if (!id) {
      return;
    }

    const product = products.find(
      (item) => item.id === id,
    );

    if (!product) {
      return;
    }

    updateItem(
      index,
      "rate",
      product.retail_rate || "0",
    );
  }

  function getStock(
    productId: number | "",
  ) {
    if (!productId || !location) {
      return 0;
    }

    const stock = stocks.find(
      (item) =>
        item.product === productId &&
        item.location === location,
    );

    return Number(
      stock?.current_stock || 0,
    );
  }

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(
        item.quantity || 0,
      );

      const rate = Number(
        item.rate || 0,
      );

      const itemDiscount = Number(
        item.discount || 0,
      );

      return (
        total +
        Math.max(
          quantity * rate - itemDiscount,
          0,
        )
      );
    }, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return (
      subtotal -
      Number(discount || 0) +
      Number(tax || 0)
    );
  }, [subtotal, discount, tax]);

  function validateForm() {
    if (!invoiceNumber.trim()) {
      return "Invoice number is required.";
    }

    if (!customer) {
      return "Please select a customer.";
    }

    if (!location) {
      return "Please select a location.";
    }

    if (!saleDate) {
      return "Sale date is required.";
    }

    if (items.length === 0) {
      return "Add at least one product.";
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.product) {
        return `Please select a product for item ${
          i + 1
        }.`;
      }

      const quantity = Number(
        item.quantity || 0,
      );

      if (quantity <= 0) {
        return `Quantity must be greater than zero for item ${
          i + 1
        }.`;
      }

      const rate = Number(
        item.rate || 0,
      );

      if (rate < 0) {
        return `Rate cannot be negative for item ${
          i + 1
        }.`;
      }

      const itemDiscount = Number(
        item.discount || 0,
      );

      if (itemDiscount < 0) {
        return `Discount cannot be negative for item ${
          i + 1
        }.`;
      }

      if (
        itemDiscount >
        quantity * rate
      ) {
        return `Discount cannot exceed item amount for item ${
          i + 1
        }.`;
      }
    }

    if (Number(discount || 0) < 0) {
      return "Discount cannot be negative.";
    }

    if (Number(tax || 0) < 0) {
      return "Tax cannot be negative.";
    }

    if (totalAmount < 0) {
      return "Total amount cannot be negative.";
    }

    return "";
  }

  async function saveSale() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const validationError =
        validateForm();

      if (validationError) {
        setError(validationError);
        return;
      }

      const payload = {
        invoice_number:
          invoiceNumber.trim(),

        customer: Number(customer),

        sale_date: saleDate,

        location: Number(location),

        discount: money(discount),

        tax: money(tax),

        notes: notes.trim(),

        items: items.map((item) => ({
          product: Number(item.product),
          quantity: money(item.quantity),
          rate: money(item.rate),
          discount: money(item.discount),
        })),
      };

      await apiRequest<Sale>(
        "/sales/",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      setSuccess(
        "Sale draft created successfully.",
      );

      setShowForm(false);
      resetForm();

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save sale.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function completeSale(
    saleId: number,
  ) {
    const confirmed = window.confirm(
      "Complete this sale?\n\nStock will be deducted immediately.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCompletingId(saleId);
      setError("");
      setSuccess("");

      await apiRequest<Sale>(
        `/sales/${saleId}/complete/`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setSuccess(
        "Sale completed successfully. Inventory has been updated.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete sale.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  const filteredSales = sales.filter(
    (sale) => {
      const query =
        search.toLowerCase();

      return (
        sale.invoice_number
          .toLowerCase()
          .includes(query) ||
        sale.customer_name
          .toLowerCase()
          .includes(query) ||
        sale.status
          .toLowerCase()
          .includes(query)
      );
    },
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Sales
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          Loading sales...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sales
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage sales invoices and transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewSale}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + New Sale
        </button>

      </div>

      {/* MESSAGES */}

      {error && (
        <div className="mt-5 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* SALES LIST */}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="font-semibold text-slate-900">
              Sales Invoices
            </h2>

            <p className="text-xs text-slate-500">
              {filteredSales.length} invoice
              {filteredSales.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search invoice or customer..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 md:w-72"
          />

        </div>

        {filteredSales.length === 0 ? (
          <div className="p-10 text-center">

            <div className="text-4xl">
              🧾
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              No sales found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create your first sales invoice.
            </p>

            <button
              type="button"
              onClick={openNewSale}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Create Sale
            </button>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-4 py-3">
                    Invoice
                  </th>

                  <th className="px-4 py-3">
                    Customer
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Location
                  </th>

                  <th className="px-4 py-3 text-right">
                    Total
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredSales.map(
                  (sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50"
                    >

                      <td className="px-4 py-3 font-medium text-slate-900">
                        {sale.invoice_number}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {sale.customer_name}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {sale.sale_date}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {sale.location_name}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        ₹{money(
                          sale.total_amount,
                        )}
                      </td>

                      <td className="px-4 py-3">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            sale.status ===
                            "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {sale.status}
                        </span>

                      </td>

                      <td className="px-4 py-3 text-right">

                        {sale.status ===
                          "DRAFT" && (
                          <button
                            type="button"
                            disabled={
                              completingId ===
                              sale.id
                            }
                            onClick={() =>
                              completeSale(
                                sale.id,
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {completingId ===
                            sale.id
                              ? "Completing..."
                              : "Complete"}
                          </button>
                        )}

                        {sale.status ===
                          "COMPLETED" && (
                          <span className="text-xs text-slate-400">
                            Completed
                          </span>
                        )}

                      </td>

                    </tr>
                  ),
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* NEW SALE MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">

          <div className="mx-auto my-8 max-w-6xl rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  New Sale
                </h2>

                <p className="text-xs text-slate-500">
                  Create a draft sales invoice.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-6 p-6">

              {/* BASIC DETAILS */}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Invoice Number
                  </label>

                  <input
                    value={invoiceNumber}
                    onChange={(event) =>
                      setInvoiceNumber(
                        event.target.value,
                      )
                    }
                    placeholder="SAL-00001"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer
                  </label>

                  <select
                    value={customer}
                    onChange={(event) =>
                      setCustomer(
                        event.target.value
                          ? Number(
                              event.target.value,
                            )
                          : "",
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">
                      Select customer
                    </option>

                    {customers
                      .filter(
                        (item) =>
                          item.status ===
                          "ACTIVE",
                      )
                      .map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.code} -{" "}
                          {item.shop_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Location
                  </label>

                  <select
                    value={location}
                    onChange={(event) =>
                      setLocation(
                        event.target.value
                          ? Number(
                              event.target.value,
                            )
                          : "",
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">
                      Select location
                    </option>

                    {locations
                      .filter(
                        (item) =>
                          item.status ===
                          "ACTIVE",
                      )
                      .map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.code} -{" "}
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Sale Date
                  </label>

                  <input
                    type="date"
                    value={saleDate}
                    onChange={(event) =>
                      setSaleDate(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

              </div>

              {/* ITEMS */}

              <div>

                <div className="mb-3 flex items-center justify-between">

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Sale Items
                    </h3>

                    <p className="text-xs text-slate-500">
                      Select products and enter quantities.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + Add Item
                  </button>

                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="min-w-[900px] w-full text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                      <tr>
                        <th className="px-3 py-3 text-left">
                          Product
                        </th>

                        <th className="px-3 py-3 text-right">
                          Stock
                        </th>

                        <th className="px-3 py-3 text-right">
                          Quantity
                        </th>

                        <th className="px-3 py-3 text-right">
                          Rate
                        </th>

                        <th className="px-3 py-3 text-right">
                          Discount
                        </th>

                        <th className="px-3 py-3 text-right">
                          Amount
                        </th>

                        <th className="px-3 py-3">
                          Action
                        </th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {items.map(
                        (item, index) => {

                          const amount =
                            Math.max(
                              Number(
                                item.quantity ||
                                  0,
                              ) *
                                Number(
                                  item.rate ||
                                    0,
                                ) -
                                Number(
                                  item.discount ||
                                    0,
                                ),
                              0,
                            );

                          const stock =
                            getStock(
                              item.product,
                            );

                          return (
                            <tr
                              key={index}
                            >

                              <td className="px-3 py-3">

                                <select
                                  value={
                                    item.product
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    selectProduct(
                                      index,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                >

                                  <option value="">
                                    Select product
                                  </option>

                                  {products
                                    .filter(
                                      (
                                        product,
                                      ) =>
                                        product.status ===
                                        "ACTIVE",
                                    )
                                    .map(
                                      (
                                        product,
                                      ) => (
                                        <option
                                          key={
                                            product.id
                                          }
                                          value={
                                            product.id
                                          }
                                        >
                                          {
                                            product.hsn_code
                                          }{" "}
                                          -{" "}
                                          {
                                            product.name
                                          }
                                        </option>
                                      ),
                                    )}

                                </select>

                              </td>

                              <td className="px-3 py-3 text-right">

                                {location &&
                                item.product ? (
                                  <span
                                    className={
                                      stock <=
                                      0
                                        ? "font-semibold text-red-600"
                                        : "font-medium text-slate-700"
                                    }
                                  >
                                    {money(
                                      stock,
                                    )}
                                  </span>
                                ) : (
                                  "-"
                                )}

                              </td>

                              <td className="px-3 py-3">

                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      index,
                                      "quantity",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-right"
                                />

                              </td>

                              <td className="px-3 py-3">

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.rate
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      index,
                                      "rate",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-right"
                                />

                              </td>

                              <td className="px-3 py-3">

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.discount
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      index,
                                      "discount",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-right"
                                />

                              </td>

                              <td className="px-3 py-3 text-right font-semibold text-slate-900">
                                ₹
                                {money(
                                  amount,
                                )}
                              </td>

                              <td className="px-3 py-3">

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeItem(
                                      index,
                                    )
                                  }
                                  disabled={
                                    items.length ===
                                    1
                                  }
                                  className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  Remove
                                </button>

                              </td>

                            </tr>
                          );
                        },
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* NOTES + TOTALS */}

              <div className="grid gap-6 lg:grid-cols-2">

                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value,
                      )
                    }
                    rows={5}
                    placeholder="Optional notes..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />

                </div>

                <div className="rounded-xl bg-slate-50 p-5">

                  <div className="space-y-3">

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Subtotal
                      </span>

                      <span className="font-medium">
                        ₹
                        {money(
                          subtotal,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">

                      <label className="text-sm text-slate-500">
                        Discount
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(event) =>
                          setDiscount(
                            event.target
                              .value,
                          )
                        }
                        className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm"
                      />

                    </div>

                    <div className="flex items-center justify-between gap-4">

                      <label className="text-sm text-slate-500">
                        Tax
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax}
                        onChange={(event) =>
                          setTax(
                            event.target
                              .value,
                          )
                        }
                        className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm"
                      />

                    </div>

                    <div className="border-t border-slate-200 pt-3">

                      <div className="flex justify-between">

                        <span className="font-semibold text-slate-900">
                          Total
                        </span>

                        <span className="text-xl font-bold text-slate-900">
                          ₹
                          {money(
                            totalAmount,
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveSale}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
