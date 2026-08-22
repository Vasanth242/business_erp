import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/common/Modal";

type Supplier = {
  id: number;
  code: string;
  name: string;
};

type Product = {
  id: number;
  hsn_code: string;
  name: string;
  grade?: string | null;
};

type Location = {
  id: number;
  code: string;
  name: string;
};

type PurchaseItem = {
  product: number | "";
  quantity: string;
  rate: string;
  discount: string;
};

type Purchase = {
  id: number;
  invoice_number: string;
  supplier: number;
  supplier_name: string;
  purchase_date: string;
  invoice_date: string;
  location: number;
  location_name: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total_amount: string;
  notes: string;
  items: Array<{
    id: number;
    product: number;
    product_name: string;
    product_hsn: string;
    quantity: string;
    rate: string;
    discount: string;
    amount: string;
  }>;
  created_at: string;
  created_by_name: string | null;
  updated_at: string;
  updated_by_name: string | null;
};

const today = new Date()
  .toISOString()
  .split("T")[0];

const emptyItem = (): PurchaseItem => ({
  product: "",
  quantity: "",
  rate: "",
  discount: "0",
});

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [showModal, setShowModal] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [completingId, setCompletingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [form, setForm] = useState({
    invoice_number: "",
    supplier: "",
    purchase_date: today,
    invoice_date: today,
    location: "",
    discount: "0",
    tax: "0",
    notes: "",
  });

  const [items, setItems] =
    useState<PurchaseItem[]>([
      emptyItem(),
    ]);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const fetchPurchases = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/purchases/",
        {
          params: search
            ? { search }
            : {},
        }
      );

      setPurchases(
        response.data.results || []
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load purchases."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get(
        "/suppliers/"
      );

      setSuppliers(
        response.data.results || []
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load suppliers."
      );
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get(
        "/products/"
      );

      setProducts(
        response.data.results || []
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load products."
      );
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get(
        "/inventory/locations/"
      );

      setLocations(
        response.data.results || []
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load locations."
      );
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchLocations();
  }, []);

  // =========================================================
  // FORM
  // =========================================================

  const resetForm = () => {
    setForm({
      invoice_number: "",
      supplier: "",
      purchase_date: today,
      invoice_date: today,
      location: "",
      discount: "0",
      tax: "0",
      notes: "",
    });

    setItems([
      emptyItem(),
    ]);
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");

    resetForm();

    setShowModal(true);
  };

  const closeModal = (force = false) => {
    if (saving && !force) {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  // =========================================================
  // ITEM HANDLING
  // =========================================================

  const updateItem = (
    index: number,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    setItems(current =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems(current => [
      ...current,
      emptyItem(),
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return;
    }

    setItems(current =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  // =========================================================
  // CALCULATIONS
  // =========================================================

  const getItemAmount = (
    item: PurchaseItem
  ) => {
    const quantity =
      Number(item.quantity) || 0;

    const rate =
      Number(item.rate) || 0;

    const discount =
      Number(item.discount) || 0;

    const amount =
      quantity * rate - discount;

    return Math.max(
      amount,
      0
    );
  };

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total + getItemAmount(item),
      0
    );
  }, [items]);

  const discount =
    Number(form.discount) || 0;

  const tax =
    Number(form.tax) || 0;

  const total =
    subtotal -
    discount +
    tax;

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {

    if (!form.invoice_number.trim()) {
      return "Invoice number is required.";
    }
    
    if (!form.supplier) {
      return "Please select a supplier.";
    }

    if (!form.location) {
      return "Please select a location.";
    }

    if (!form.purchase_date) {
      return "Purchase date is required.";
    }

    if (!form.invoice_date) {
      return "Invoice date is required.";
    }

    if (discount < 0) {
      return "Discount cannot be negative.";
    }

    if (tax < 0) {
      return "Tax cannot be negative.";
    }

    if (total < 0) {
      return "Total amount cannot be negative.";
    }

    if (items.length === 0) {
      return "At least one purchase item is required.";
    }

    for (
      let index = 0;
      index < items.length;
      index++
    ) {
      const item = items[index];

      if (!item.product) {
        return `Please select a product for item ${
          index + 1
        }.`;
      }

      const quantity =
        Number(item.quantity);

      const rate =
        Number(item.rate);

      const itemDiscount =
        Number(item.discount) || 0;

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return `Quantity must be greater than zero for item ${
          index + 1
        }.`;
      }

      if (
        !Number.isFinite(rate) ||
        rate < 0
      ) {
        return `Rate cannot be negative for item ${
          index + 1
        }.`;
      }

      if (
        !Number.isFinite(itemDiscount) ||
        itemDiscount < 0
      ) {
        return `Item discount cannot be negative for item ${
          index + 1
        }.`;
      }

      if (
        itemDiscount >
        quantity * rate
      ) {
        return `Item discount cannot exceed the item amount for item ${
          index + 1
        }.`;
      }
    }

    return null;
  };

  // =========================================================
  // CREATE PURCHASE
  // =========================================================

  const savePurchase = async () => {
    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {

        invoice_number:
          form.invoice_number.trim(),

        supplier:
          Number(form.supplier),

        purchase_date:
          form.purchase_date,

        invoice_date:
          form.invoice_date,

        location:
          Number(form.location),

        discount:
          Number(form.discount) || 0,

        tax:
          Number(form.tax) || 0,

        notes:
          form.notes.trim(),

        items: items.map(item => ({
          product:
            Number(item.product),

          quantity:
            Number(item.quantity),

          rate:
            Number(item.rate),

          discount:
            Number(item.discount) || 0,
        })),
      };

      const response =
        await api.post(
          "/purchases/",
          payload
        );

      setSuccess(
        `Purchase ${response.data.invoice_number} created successfully.`
      );

      closeModal(true);

      await fetchPurchases();
      } catch (err: any) {
      console.error("CREATE PURCHASE ERROR:", err);

      const data = err?.response?.data;

      if (data && typeof data === "object") {
        if (data.detail) {
          setError(String(data.detail));
        } else {
          const messages: string[] = [];

          Object.entries(data).forEach(
            ([field, value]) => {
              if (Array.isArray(value)) {
                messages.push(
                  `${field}: ${value.join(", ")}`
                );
              } else if (typeof value === "string") {
                messages.push(
                  `${field}: ${value}`
                );
              } else {
                messages.push(
                  `${field}: ${JSON.stringify(value)}`
                );
              }
            }
          );

          setError(
            messages.length > 0
              ? messages.join(" | ")
              : "Unable to create purchase."
          );
        }
      } else {
        setError(
          "Unable to create purchase."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // COMPLETE PURCHASE
  // =========================================================

  const completePurchase = async (
    purchase: Purchase
  ) => {
    if (
      purchase.status ===
      "COMPLETED"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Complete purchase ${purchase.invoice_number}?\n\nThis will update inventory stock.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCompletingId(
        purchase.id
      );

      setError("");
      setSuccess("");

      await api.post(
        `/purchases/${purchase.id}/complete/`
      );

      setSuccess(
        `Purchase ${purchase.invoice_number} completed successfully. Inventory stock has been updated.`
      );

      await fetchPurchases();
    } catch (err: any) {
      console.error(err);

      const data =
        err?.response?.data;

      if (
        data &&
        typeof data === "object"
      ) {
        setError(
          data.detail ||
            JSON.stringify(data)
        );
      } else {
        setError(
          "Unable to complete purchase."
        );
      }
    } finally {
      setCompletingId(null);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Purchases
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage purchase bills and update inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Purchase
        </button>

      </div>

      {/* SUCCESS */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SEARCH */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <input
          type="text"
          value={search}
          onChange={event =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search invoice or supplier..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />

      </div>

      {/* PURCHASE TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="overflow-x-auto">

          <table className="min-w-full text-left text-sm">

            <thead className="bg-slate-50 text-xs uppercase text-slate-500">

              <tr>

                <th className="px-5 py-3">
                  Invoice
                </th>

                <th className="px-5 py-3">
                  Supplier
                </th>

                <th className="px-5 py-3">
                  Date
                </th>

                <th className="px-5 py-3">
                  Location
                </th>

                <th className="px-5 py-3">
                  Status
                </th>

                <th className="px-5 py-3 text-right">
                  Total
                </th>

                <th className="px-5 py-3 text-right">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Loading purchases...
                  </td>
                </tr>

              ) : purchases.length === 0 ? (

                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No purchases found.
                  </td>
                </tr>

              ) : (

                purchases.map(
                  purchase => (

                    <tr
                      key={purchase.id}
                      className="hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {purchase.invoice_number}
                      </td>

                      <td className="px-5 py-4">
                        {purchase.supplier_name}
                      </td>

                      <td className="px-5 py-4">
                        {purchase.purchase_date}
                      </td>

                      <td className="px-5 py-4">
                        {purchase.location_name}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            purchase.status ===
                            "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {purchase.status}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        ₹
                        {Number(
                          purchase.total_amount
                        ).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-right">

                        {purchase.status ===
                        "COMPLETED" ? (

                          <span className="text-xs font-medium text-green-600">
                            Completed
                          </span>

                        ) : (

                          <button
                            type="button"
                            disabled={
                              completingId ===
                              purchase.id
                            }
                            onClick={() =>
                              completePurchase(
                                purchase
                              )
                            }
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {completingId ===
                            purchase.id
                              ? "Completing..."
                              : "Complete"}
                          </button>

                        )}

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =====================================================
          CREATE PURCHASE MODAL
          ===================================================== */}

          <Modal
            open={showModal}
            onClose={closeModal}
            title="New Purchase"
            description="Create a purchase bill."
            maxWidth="max-w-6xl"
          >

            <div className="space-y-6 p-6">

              {/* PURCHASE DETAILS */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Invoice Number
                  </label>

                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        invoice_number:
                          event.target.value,
                      }))
                    }
                    placeholder="PUR-00002"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Supplier
                  </label>

                  <select
                    value={form.supplier}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        supplier:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {suppliers.map(
                      supplier => (
                        <option
                          key={supplier.id}
                          value={supplier.id}
                        >
                          {supplier.code} -{" "}
                          {supplier.name}
                        </option>
                      )
                    )}

                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Location
                  </label>

                  <select
                    value={form.location}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        location:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">
                      Select location
                    </option>

                    {locations.map(
                      location => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.code} -{" "}
                          {location.name}
                        </option>
                      )
                    )}

                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Purchase Date
                  </label>

                  <input
                    type="date"
                    value={
                      form.purchase_date
                    }
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        purchase_date:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Invoice Date
                  </label>

                  <input
                    type="date"
                    value={
                      form.invoice_date
                    }
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        invoice_date:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

              </div>

              {/* ITEMS */}

              <div>

                <div className="mb-3 flex items-center justify-between">

                  <h3 className="font-semibold text-slate-900">
                    Purchase Items
                  </h3>

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    + Add Item
                  </button>

                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="min-w-full text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                      <tr>

                        <th className="px-3 py-3">
                          Product
                        </th>

                        <th className="px-3 py-3">
                          Quantity
                        </th>

                        <th className="px-3 py-3">
                          Rate
                        </th>

                        <th className="px-3 py-3">
                          Discount
                        </th>

                        <th className="px-3 py-3 text-right">
                          Amount
                        </th>

                        <th className="px-3 py-3">
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {items.map(
                        (item, index) => (

                          <tr
                            key={index}
                          >

                            <td className="px-3 py-3">

                              <select
                                value={
                                  item.product
                                }
                                onChange={event =>
                                  updateItem(
                                    index,
                                    "product",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-full min-w-60 rounded-lg border border-slate-300 px-3 py-2"
                              >

                                <option value="">
                                  Select product
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
                                      {
                                        product.hsn_code
                                      }{" "}
                                      -{" "}
                                      {
                                        product.name
                                      }
                                      {product.grade
                                        ? ` (${product.grade})`
                                        : ""}
                                    </option>
                                  )
                                )}

                              </select>

                            </td>

                            <td className="px-3 py-3">

                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                  item.quantity
                                }
                                onChange={event =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                                placeholder="0"
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
                                onChange={event =>
                                  updateItem(
                                    index,
                                    "rate",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                                placeholder="0"
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
                                onChange={event =>
                                  updateItem(
                                    index,
                                    "discount",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                                placeholder="0"
                              />

                            </td>

                            <td className="px-3 py-3 text-right font-medium text-slate-900">

                              ₹
                              {getItemAmount(
                                item
                              ).toFixed(2)}

                            </td>

                            <td className="px-3 py-3">

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index
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

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* TOTALS */}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={form.notes}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        notes:
                          event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="Optional notes..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
                        {subtotal.toFixed(
                          2
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
                        value={
                          form.discount
                        }
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            discount:
                              event.target.value,
                          }))
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
                        value={
                          form.tax
                        }
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            tax:
                              event.target.value,
                          }))
                        }
                        className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm"
                      />

                    </div>

                    <div className="border-t border-slate-200 pt-3">

                      <div className="flex justify-between text-base font-semibold text-slate-900">

                        <span>
                          Total
                        </span>

                        <span>
                          ₹
                          {total.toFixed(
                            2
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* MODAL ACTIONS */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={() => closeModal()}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={savePurchase}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Purchase"}
                </button>

              </div>

            </div>
          </Modal>
      </div>
      );
    }