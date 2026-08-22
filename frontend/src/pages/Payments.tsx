import { type ReactNode, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/common/Modal";

type PaymentType = "CUSTOMER" | "SUPPLIER";

type PaymentMethod =
  | "CASH"
  | "BANK"
  | "UPI"
  | "CHEQUE"
  | "OTHER";

type PaymentStatus =
  | "DRAFT"
  | "COMPLETED"
  | "CANCELLED";

interface Customer {
  id: number;
  code: string;
  shop_name: string;
}

interface Supplier {
  id: number;
  code: string;
  name: string;
}

interface Payment {
  id: number;
  payment_number: string;

  payment_type: PaymentType;
  payment_type_display: string;

  customer: number | null;
  customer_code?: string | null;
  customer_name?: string | null;

  supplier: number | null;
  supplier_code?: string | null;
  supplier_name?: string | null;

  payment_date: string;

  payment_method: PaymentMethod;
  payment_method_display: string;

  amount: string;

  reference_number: string;
  notes: string;

  status: PaymentStatus;
  status_display: string;

  created_at: string;
  created_by_name: string | null;

  updated_at: string;
  updated_by_name: string | null;
}

interface PaymentForm {
  payment_number: string;
  payment_type: PaymentType;

  customer: string;
  supplier: string;

  payment_date: string;

  payment_method: PaymentMethod;

  amount: string;

  reference_number: string;
  notes: string;
}

const API_BASE = "";

const today = new Date()
  .toISOString()
  .split("T")[0];

const initialForm: PaymentForm = {
  payment_number: "",
  payment_type: "CUSTOMER",

  customer: "",
  supplier: "",

  payment_date: today,

  payment_method: "CASH",

  amount: "",

  reference_number: "",
  notes: "",
};

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const [customers, setCustomers] = useState<Customer[]>(
    []
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [completingId, setCompletingId] =
    useState<number | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState<PaymentForm>(initialForm);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState<"ALL" | PaymentType>("ALL");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | PaymentStatus>("ALL");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        paymentsResponse,
        customersResponse,
        suppliersResponse,
      ] = await Promise.all([
        api.get(`${API_BASE}/payments/`),
        api.get(`${API_BASE}/customers/`),
        api.get(`${API_BASE}/suppliers/`),
      ]);

      const paymentsData = paymentsResponse.data as any;
      const customersData = customersResponse.data as any;
      const suppliersData = suppliersResponse.data as any;

      setPayments(
        paymentsData.results ??
          paymentsData
      );

      setCustomers(
        customersData.results ??
          customersData
      );

      setSuppliers(
        suppliersData.results ??
          suppliersData
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setError("");
    setSuccess("");

    setForm({
      ...initialForm,
      payment_number:
        generatePaymentNumber(),
    });

    setShowForm(true);
  }

  function closeForm(force = false) {
    if (saving && !force) {
      return;
    }

    setShowForm(false);
    setForm(initialForm);
  }

  function generatePaymentNumber() {
    const nextNumber =
      payments.length + 1;

    return `PAY-${String(
      nextNumber
    ).padStart(5, "0")}`;
  }

  function updateForm(
    field: keyof PaymentForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handlePaymentTypeChange(
    value: PaymentType
  ) {
    setForm((previous) => ({
      ...previous,

      payment_type: value,

      customer:
        value === "CUSTOMER"
          ? previous.customer
          : "",

      supplier:
        value === "SUPPLIER"
          ? previous.supplier
          : "",
    }));
  }

  async function savePayment() {
    setError("");
    setSuccess("");

    if (!form.payment_number.trim()) {
      setError(
        "Payment number is required."
      );
      return;
    }

    if (!form.payment_date) {
      setError(
        "Payment date is required."
      );
      return;
    }

    if (!form.amount) {
      setError(
        "Payment amount is required."
      );
      return;
    }

    const amount = Number(form.amount);

    if (
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      setError(
        "Payment amount must be greater than zero."
      );
      return;
    }

    if (
      form.payment_type === "CUSTOMER" &&
      !form.customer
    ) {
      setError(
        "Please select a customer."
      );
      return;
    }

    if (
      form.payment_type === "SUPPLIER" &&
      !form.supplier
    ) {
      setError(
        "Please select a supplier."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        payment_number:
          form.payment_number.trim(),

        payment_type:
          form.payment_type,

        customer:
          form.payment_type === "CUSTOMER"
            ? Number(form.customer)
            : null,

        supplier:
          form.payment_type === "SUPPLIER"
            ? Number(form.supplier)
            : null,

        payment_date:
          form.payment_date,

        payment_method:
          form.payment_method,

        amount:
          form.amount,

        reference_number:
          form.reference_number.trim(),

        notes:
          form.notes.trim(),
      };

      const response = await api.post(
        `${API_BASE}/payments/`,
        payload,
      );

      const data = response.data as Payment;

      setPayments((previous) => [
        data,
        ...previous,
      ]);

      setSuccess(
        `Payment ${data.payment_number} saved successfully.`
      );

      setShowForm(false);

      setForm(initialForm);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save payment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function completePayment(
    payment: Payment
  ) {
    if (
      payment.status !== "DRAFT"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Complete payment ${payment.payment_number} for ₹${formatAmount(
          payment.amount
        )}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCompletingId(payment.id);

      setError("");
      setSuccess("");

      const response = await api.post(
        `${API_BASE}/payments/${payment.id}/complete/`,
      );

      const data = response.data as Payment;

      setPayments((previous) =>
        previous.map((item) =>
          item.id === payment.id
            ? data
            : item
        )
      );

      setSuccess(
        `Payment ${payment.payment_number} completed successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete payment."
      );
    } finally {
      setCompletingId(null);
    }
  }

  const filteredPayments =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return payments.filter(
        (payment) => {
          if (
            typeFilter !== "ALL" &&
            payment.payment_type !==
              typeFilter
          ) {
            return false;
          }

          if (
            statusFilter !== "ALL" &&
            payment.status !==
              statusFilter
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          const searchable = [
            payment.payment_number,

            payment.customer_code ??
              "",

            payment.customer_name ??
              "",

            payment.supplier_code ??
              "",

            payment.supplier_name ??
              "",

            payment.reference_number,

            payment.payment_method_display,

            payment.payment_type_display,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            searchValue
          );
        }
      );
    }, [
      payments,
      search,
      typeFilter,
      statusFilter,
    ]);

  const totalCompleted =
    useMemo(() => {
      return payments
        .filter(
          (payment) =>
            payment.status ===
            "COMPLETED"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(payment.amount),
          0
        );
    }, [payments]);

  const customerReceipts =
    useMemo(() => {
      return payments
        .filter(
          (payment) =>
            payment.payment_type ===
              "CUSTOMER" &&
            payment.status ===
              "COMPLETED"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(payment.amount),
          0
        );
    }, [payments]);

  const supplierPayments =
    useMemo(() => {
      return payments
        .filter(
          (payment) =>
            payment.payment_type ===
              "SUPPLIER" &&
            payment.status ===
              "COMPLETED"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(payment.amount),
          0
        );
    }, [payments]);

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer receipts and supplier payments.
          </p>
        </div>

        <div className="flex gap-2">

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + New Payment
          </button>

        </div>
      </div>

      {/* Messages */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Summary */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <SummaryCard
          title="Completed Receipts"
          amount={customerReceipts}
          description="Customer payments"
        />

        <SummaryCard
          title="Completed Payments"
          amount={supplierPayments}
          description="Supplier payments"
        />

        <SummaryCard
          title="Total Completed"
          amount={totalCompleted}
          description="All completed payments"
        />

      </div>

      {/* Create Form */}

        <Modal
          open={showForm}
          onClose={closeForm}
          title="New Payment"
          description="Create a customer receipt or supplier payment."
          maxWidth="max-w-3xl"
        >

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

            {/* Payment Number */}

            <FormField
              label="Payment Number"
              required
            >
              <input
                value={
                  form.payment_number
                }
                onChange={(event) =>
                  updateForm(
                    "payment_number",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="PAY-00001"
              />
            </FormField>

            {/* Payment Type */}

            <FormField
              label="Payment Type"
              required
            >
              <select
                value={
                  form.payment_type
                }
                onChange={(event) =>
                  handlePaymentTypeChange(
                    event.target.value as PaymentType
                  )
                }
                className={inputClass}
              >
                <option value="CUSTOMER">
                  Customer Receipt
                </option>

                <option value="SUPPLIER">
                  Supplier Payment
                </option>
              </select>
            </FormField>

            {/* Customer */}

            {form.payment_type ===
              "CUSTOMER" && (
              <FormField
                label="Customer"
                required
              >
                <select
                  value={
                    form.customer
                  }
                  onChange={(event) =>
                    updateForm(
                      "customer",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {customer.code} -{" "}
                        {
                          customer.shop_name
                        }
                      </option>
                    )
                  )}
                </select>
              </FormField>
            )}

            {/* Supplier */}

            {form.payment_type ===
              "SUPPLIER" && (
              <FormField
                label="Supplier"
                required
              >
                <select
                  value={
                    form.supplier
                  }
                  onChange={(event) =>
                    updateForm(
                      "supplier",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select supplier
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={
                          supplier.id
                        }
                        value={
                          supplier.id
                        }
                      >
                        {supplier.code} -{" "}
                        {
                          supplier.name
                        }
                      </option>
                    )
                  )}
                </select>
              </FormField>
            )}

            {/* Date */}

            <FormField
              label="Payment Date"
              required
            >
              <input
                type="date"
                value={
                  form.payment_date
                }
                onChange={(event) =>
                  updateForm(
                    "payment_date",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </FormField>

            {/* Payment Method */}

            <FormField
              label="Payment Method"
              required
            >
              <select
                value={
                  form.payment_method
                }
                onChange={(event) =>
                  updateForm(
                    "payment_method",
                    event.target.value as PaymentMethod
                  )
                }
                className={inputClass}
              >
                <option value="CASH">
                  Cash
                </option>

                <option value="BANK">
                  Bank Transfer
                </option>

                <option value="UPI">
                  UPI
                </option>

                <option value="CHEQUE">
                  Cheque
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </FormField>

            {/* Amount */}

            <FormField
              label="Amount"
              required
            >
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  updateForm(
                    "amount",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="0.00"
              />
            </FormField>

            {/* Reference */}

            <FormField
              label="Reference Number"
            >
              <input
                value={
                  form.reference_number
                }
                onChange={(event) =>
                  updateForm(
                    "reference_number",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="Transaction / cheque reference"
              />
            </FormField>

            {/* Notes */}

            <div className="md:col-span-2">
              <FormField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="Additional notes..."
                />
              </FormField>
            </div>

          </div>

          {/* Form Actions */}

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

            <button
              type="button"
              onClick={() => closeForm()}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={savePayment}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Draft"}
            </button>

          </div>
        </Modal>

      {/* Filters */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            className={inputClass}
            placeholder="Search payment, customer, supplier..."
          />

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value as
                  | "ALL"
                  | PaymentType
              )
            }
            className={inputClass}
          >
            <option value="ALL">
              All Payment Types
            </option>

            <option value="CUSTOMER">
              Customer Receipts
            </option>

            <option value="SUPPLIER">
              Supplier Payments
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "ALL"
                  | PaymentStatus
              )
            }
            className={inputClass}
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>

        </div>
      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <div>
            <h2 className="font-semibold text-slate-900">
              Payments
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {filteredPayments.length} payment
              {filteredPayments.length !==
              1
                ? "s"
                : ""}
            </p>
          </div>

        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Loading payments...
          </div>
        ) : filteredPayments.length ===
          0 ? (
          <div className="px-6 py-12 text-center">

            <p className="text-sm font-medium text-slate-700">
              No payments found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create your first customer receipt or supplier payment.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + New Payment
            </button>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-slate-200">

              <thead className="bg-slate-50">

                <tr>

                  <TableHeader>
                    Payment
                  </TableHeader>

                  <TableHeader>
                    Type
                  </TableHeader>

                  <TableHeader>
                    Party
                  </TableHeader>

                  <TableHeader>
                    Date
                  </TableHeader>

                  <TableHeader>
                    Method
                  </TableHeader>

                  <TableHeader align="right">
                    Amount
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader>
                    Action
                  </TableHeader>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">

                {filteredPayments.map(
                  (payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50"
                    >

                      <td className="whitespace-nowrap px-6 py-4">

                        <div className="font-medium text-slate-900">
                          {
                            payment.payment_number
                          }
                        </div>

                        {payment.reference_number && (
                          <div className="mt-1 text-xs text-slate-500">
                            Ref:{" "}
                            {
                              payment.reference_number
                            }
                          </div>
                        )}

                      </td>

                      <td className="whitespace-nowrap px-6 py-4">

                        <TypeBadge
                          type={
                            payment.payment_type
                          }
                        />

                      </td>

                      <td className="whitespace-nowrap px-6 py-4">

                        {payment.payment_type ===
                        "CUSTOMER" ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {
                                payment.customer_name
                              }
                            </div>

                            <div className="text-xs text-slate-500">
                              {
                                payment.customer_code
                              }
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800">
                              {
                                payment.supplier_name
                              }
                            </div>

                            <div className="text-xs text-slate-500">
                              {
                                payment.supplier_code
                              }
                            </div>
                          </div>
                        )}

                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {formatDate(
                          payment.payment_date
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {
                          payment.payment_method_display
                        }
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-900">
                        ₹
                        {formatAmount(
                          payment.amount
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">

                        <StatusBadge
                          status={
                            payment.status
                          }
                        />

                      </td>

                      <td className="whitespace-nowrap px-6 py-4">

                        {payment.status ===
                        "DRAFT" ? (
                          <button
                            type="button"
                            onClick={() =>
                              completePayment(
                                payment
                              )
                            }
                            disabled={
                              completingId ===
                              payment.id
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {completingId ===
                            payment.id
                              ? "Completing..."
                              : "Complete"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            —
                          </span>
                        )}

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
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

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

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function SummaryCard({
  title,
  amount,
  description,
}: {
  title: string;
  amount: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        ₹{formatAmount(amount)}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

function TypeBadge({
  type,
}: {
  type: PaymentType;
}) {
  if (type === "CUSTOMER") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        Customer Receipt
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
      Supplier Payment
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        Completed
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      Draft
    </span>
  );
}

function formatAmount(
  value: string | number
) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0.00";
  }

  return number.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatDate(
  value: string
) {
  if (!value) {
    return "-";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}
