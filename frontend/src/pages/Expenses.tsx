import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";
import Modal from "../components/common/Modal";


type PaymentMethod =
  | "CASH"
  | "BANK"
  | "UPI"
  | "CHEQUE"
  | "OTHER";


type ExpenseStatus =
  | "DRAFT"
  | "COMPLETED"
  | "CANCELLED";


interface Expense {
  id: number;

  expense_number: string;
  expense_date: string;

  category: number;
  category_name: string;
  category_status: "ACTIVE" | "INACTIVE";

  description: string;

  amount: string;

  payment_method: PaymentMethod;
  payment_method_display: string;

  reference_number: string;
  notes: string;

  status: ExpenseStatus;
  status_display: string;

  created_at: string;
  created_by_name: string | null;

  updated_at: string;
  updated_by_name: string | null;
}

interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}


interface ExpenseForm {
  expense_number: string;
  expense_date: string;

  category: string;
  description: string;

  amount: string;

  payment_method: PaymentMethod;

  reference_number: string;
  notes: string;
}


const today =
  new Date()
    .toISOString()
    .split("T")[0];


const initialForm: ExpenseForm = {
  expense_number: "",

  expense_date: today,

  category: "",
  description: "",

  amount: "",

  payment_method: "CASH",

  reference_number: "",
  notes: "",
};


const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";


export default function Expenses() {

  const [expenses, setExpenses] =
    useState<Expense[]>([]);


  const [categories, setCategories] =
    useState<ExpenseCategory[]>([]);


  const [loading, setLoading] =
    useState(false);

  
  const [categoriesLoading, setCategoriesLoading] =
    useState(false);


  const [saving, setSaving] =
    useState(false);


  const [completingId, setCompletingId] =
    useState<number | null>(null);


  const [cancellingId, setCancellingId] =
    useState<number | null>(null);


  const [showForm, setShowForm] =
    useState(false);


  const [editingExpense, setEditingExpense] =
    useState<Expense | null>(null);


  const [viewingExpense, setViewingExpense] =
    useState<Expense | null>(null);


  const [form, setForm] =
    useState<ExpenseForm>(
      initialForm
    );


  const [search, setSearch] =
    useState("");


  const [statusFilter, setStatusFilter] =
    useState<
      "ALL" | ExpenseStatus
    >("ALL");


  const [error, setError] =
    useState("");


  const [success, setSuccess] =
    useState("");


  // =========================================================
  // LOAD EXPENSES
  // =========================================================

  const fetchExpenses = async () => {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/expenses/",
          {
            params: search
              ? {
                  search,
                }
              : {},
          }
        );


      setExpenses(
        response.data.results || []
      );

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
          "Unable to load expenses."
        );

      }

    } finally {

      setLoading(false);

    }

  };


  // =========================================================
  // LOAD EXPENSE CATEGORIES
  // =========================================================

  const fetchCategories = async () => {

    try {

      setCategoriesLoading(true);

      const response =
        await api.get(
          "/expenses/categories/"
        );

      const results =
        response.data.results || [];

      setCategories(
        results.filter(
          (category: ExpenseCategory) =>
            category.status === "ACTIVE"
        )
      );

    } catch (err: any) {

      console.error(
        "Unable to load expense categories:",
        err
      );

      const data =
        err?.response?.data;

      if (
        data &&
        typeof data === "object"
      ) {

        setError(
          data.detail ||
          "Unable to load expense categories."
        );

      } else {

        setError(
          "Unable to load expense categories."
        );

      }

    } finally {

      setCategoriesLoading(false);

    }

  };


  useEffect(() => {

    fetchExpenses();

  }, [search]);


  useEffect(() => {

    fetchCategories();

  }, []);


  // =========================================================
  // EXPENSE NUMBER
  // =========================================================

  const generateExpenseNumber =
    () => {

      const numbers =
        expenses
          .map(
            expense => {

              const match =
                expense.expense_number.match(
                  /EXP-(\d+)/
                );

              return match
                ? Number(match[1])
                : 0;

            }
          )
          .filter(
            number =>
              Number.isFinite(number)
          );


      const highest =
        numbers.length
          ? Math.max(...numbers)
          : 0;


      return `EXP-${String(
        highest + 1
      ).padStart(5, "0")}`;

    };


  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {

    setForm({
      ...initialForm,

      expense_number:
        generateExpenseNumber(),

      expense_date:
        today,

    });

  };


  // =========================================================
  // OPEN CREATE FORM
  // =========================================================

  const openCreateForm = () => {

    setError("");
    setSuccess("");

    setEditingExpense(null);

    resetForm();

    setShowForm(true);

  };


  // =========================================================
  // OPEN EDIT FORM
  // =========================================================

  const openEditForm = (
    expense: Expense
  ) => {

    if (
      expense.status !== "DRAFT"
    ) {

      setError(
        "Only draft expenses can be edited."
      );

      return;

    }


    setError("");
    setSuccess("");

    setViewingExpense(null);

    setEditingExpense(
      expense
    );


    setForm({
      expense_number:
        expense.expense_number,

      expense_date:
        expense.expense_date,

      category:
        String(expense.category),

      description:
        expense.description,

      amount:
        expense.amount,

      payment_method:
        expense.payment_method,

      reference_number:
        expense.reference_number,

      notes:
        expense.notes,
    });


    setShowForm(true);

  };


  // =========================================================
  // CLOSE FORM
  // =========================================================

  const closeForm = (force = false) => {
    if (saving && !force) {
      return;
    }

    setShowForm(false);
    setEditingExpense(null);
    setForm(initialForm);
  };


  // =========================================================
  // OPEN VIEW
  // =========================================================

  const openViewExpense = (
    expense: Expense
  ) => {

    setError("");

    setViewingExpense(
      expense
    );

  };


  // =========================================================
  // CLOSE VIEW
  // =========================================================

  const closeViewExpense = () => {

    setViewingExpense(null);

  };


  // =========================================================
  // UPDATE FORM
  // =========================================================

  const updateForm = (
    field: keyof ExpenseForm,
    value: string
  ) => {

    setForm(
      current => ({
        ...current,

        [field]: value,
      })
    );

  };


  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {

    if (
      !form.expense_number.trim()
    ) {

      return (
        "Expense number is required."
      );

    }


    if (!form.expense_date) {

      return (
        "Expense date is required."
      );

    }


    if (!form.category.trim()) {

      return (
        "Expense category is required."
      );

    }


    const amount =
      Number(form.amount);


    if (
      !form.amount ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return (
        "Expense amount must be greater than zero."
      );

    }


    return null;

  };


  // =========================================================
  // SAVE / UPDATE EXPENSE
  // =========================================================

  const saveExpense = async () => {

    setError("");
    setSuccess("");


    const validationError =
      validateForm();


    if (validationError) {

      setError(
        validationError
      );

      return;

    }


    try {

      setSaving(true);


      const payload = {

        expense_number:
          form.expense_number.trim(),

        expense_date:
          form.expense_date,

        category:
          Number(form.category),

        description:
          form.description.trim(),

        amount:
          form.amount,

        payment_method:
          form.payment_method,

        reference_number:
          form.reference_number.trim(),

        notes:
          form.notes.trim(),

      };


      let response;


      if (editingExpense) {

        response =
          await api.put(
            `/expenses/${editingExpense.id}/`,
            payload
          );


        setSuccess(
          `Expense ${response.data.expense_number} updated successfully.`
        );

      } else {

        response =
          await api.post(
            "/expenses/",
            payload
          );


        setSuccess(
          `Expense ${response.data.expense_number} created successfully.`
        );

      }


      setShowForm(false);

      setEditingExpense(null);

      resetForm();

      await fetchExpenses();

    } catch (err: any) {

      console.error(err);

      const data =
        err?.response?.data;


      if (
        data &&
        typeof data === "object"
      ) {

        if (
          data.detail
        ) {

          setError(
            data.detail
          );

        } else {

          setError(
            Object.entries(data)
              .map(
                ([field, value]) =>
                  `${field}: ${
                    Array.isArray(value)
                      ? value.join(", ")
                      : String(value)
                  }`
              )
              .join(" | ")
          );

        }

      } else {

        setError(
          editingExpense
            ? "Unable to update expense."
            : "Unable to create expense."
        );

      }

    } finally {

      setSaving(false);

    }

  };


  // =========================================================
  // COMPLETE EXPENSE
  // =========================================================

  const completeExpense = async (
    expense: Expense
  ) => {

    if (
      expense.status !== "DRAFT"
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Complete expense ${expense.expense_number} for ₹${formatAmount(
          expense.amount
        )}?`
      );


    if (!confirmed) {
      return;
    }


    try {

      setCompletingId(
        expense.id
      );

      setError("");
      setSuccess("");


      await api.post(
        `/expenses/${expense.id}/complete/`
      );


      setSuccess(
        `Expense ${expense.expense_number} completed successfully.`
      );


      await fetchExpenses();

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
          "Unable to complete expense."
        );

      }

    } finally {

      setCompletingId(null);

    }

  };


  // =========================================================
  // CANCEL EXPENSE
  // =========================================================

  const cancelExpense = async (
    expense: Expense
  ) => {

    if (
      expense.status !== "DRAFT"
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Cancel expense ${expense.expense_number}?`
      );


    if (!confirmed) {
      return;
    }


    try {

      setCancellingId(
        expense.id
      );

      setError("");
      setSuccess("");


      await api.post(
        `/expenses/${expense.id}/cancel/`
      );


      setSuccess(
        `Expense ${expense.expense_number} cancelled successfully.`
      );


      await fetchExpenses();

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
          "Unable to cancel expense."
        );

      }

    } finally {

      setCancellingId(null);

    }

  };


  // =========================================================
  // FILTER
  // =========================================================

  const filteredExpenses =
    useMemo(() => {

      const searchValue =
        search
          .trim()
          .toLowerCase();


      return expenses.filter(
        expense => {

          if (
            statusFilter !==
              "ALL" &&
            expense.status !==
              statusFilter
          ) {

            return false;

          }


          if (!searchValue) {
            return true;
          }


          const searchable = [

            expense.expense_number,

            expense.category_name,

            expense.description,

            expense.reference_number,

            expense.payment_method_display,

            expense.status_display,

          ]
            .join(" ")
            .toLowerCase();


          return searchable.includes(
            searchValue
          );

        }
      );

    }, [
      expenses,
      search,
      statusFilter,
    ]);


  // =========================================================
  // SUMMARY
  // =========================================================

  const totalCompleted =
    useMemo(() => {

      return expenses

        .filter(
          expense =>
            expense.status ===
            "COMPLETED"
        )

        .reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense.amount
            ),

          0
        );

    }, [expenses]);


  const totalDraft =
    useMemo(() => {

      return expenses

        .filter(
          expense =>
            expense.status ===
            "DRAFT"
        )

        .reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense.amount
            ),

          0
        );

    }, [expenses]);


  const totalCancelled =
    useMemo(() => {

      return expenses

        .filter(
          expense =>
            expense.status ===
            "CANCELLED"
        )

        .reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense.amount
            ),

          0
        );

    }, [expenses]);


  const completedCount =
    expenses.filter(
      expense =>
        expense.status ===
        "COMPLETED"
    ).length;


  const draftCount =
    expenses.filter(
      expense =>
        expense.status ===
        "DRAFT"
    ).length;


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Expenses
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage business expenses and operating costs.
          </p>

        </div>


        <div className="flex gap-2">

          <button
            type="button"
            onClick={fetchExpenses}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>


          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + New Expense
          </button>

        </div>

      </div>


      {/* =====================================================
          MESSAGES
      ===================================================== */}

      {error && (

        <div className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-4 font-bold"
          >
            ×
          </button>

        </div>

      )}


      {success && (

        <div className="flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-4 font-bold"
          >
            ×
          </button>

        </div>

      )}


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

        <SummaryCard
          title="Completed"
          amount={totalCompleted}
          description={`${completedCount} completed expense${
            completedCount !== 1
              ? "s"
              : ""
          }`}
        />


        <SummaryCard
          title="Draft"
          amount={totalDraft}
          description={`${draftCount} expense${
            draftCount !== 1
              ? "s"
              : ""
          } awaiting completion`}
        />


        <SummaryCard
          title="Cancelled"
          amount={totalCancelled}
          description="Cancelled expenses"
        />


        <SummaryCard
          title="Total"
          amount={
            totalCompleted +
            totalDraft
          }
          description="Completed and draft expenses"
        />

      </div>


      {/* =====================================================
          CREATE / EDIT FORM
      ===================================================== */}
      {showForm && (
        <Modal
          open={showForm}
          onClose={closeForm}
          title={
            editingExpense
              ? "Edit Expense"
              : "New Expense"
          }
          description={
            editingExpense
              ? "Update this draft expense."
              : "Create a business expense as a draft."
          }
          maxWidth="max-w-4xl"
        >

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

            {/* EXPENSE NUMBER */}

            <FormField
              label="Expense Number"
              required
            >

              <input
                value={
                  form.expense_number
                }
                onChange={event =>
                  updateForm(
                    "expense_number",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="EXP-00001"
              />

            </FormField>


            {/* DATE */}

            <FormField
              label="Expense Date"
              required
            >

              <input
                type="date"
                value={
                  form.expense_date
                }
                onChange={event =>
                  updateForm(
                    "expense_date",
                    event.target.value
                  )
                }
                className={inputClass}
              />

            </FormField>


            {/* CATEGORY */}

            <FormField
              label="Category"
              required
            >

              <select
                value={
                  form.category
                }
                onChange={event =>
                  updateForm(
                    "category",
                    event.target.value
                  )
                }
                disabled={
                  categoriesLoading ||
                  saving
                }
                className={inputClass}
              >

                <option value="">
                  {categoriesLoading
                    ? "Loading categories..."
                    : "Select category"}
                </option>

                {categories.map(
                  category => (
                    <option
                      key={category.id}
                      value={String(category.id)}
                    >
                      {category.name}
                    </option>
                  )
                )}

              </select>

            </FormField>


            {/* AMOUNT */}

            <FormField
              label="Amount"
              required
            >

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={
                  form.amount
                }
                onChange={event =>
                  updateForm(
                    "amount",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="0.00"
              />

            </FormField>


            {/* PAYMENT METHOD */}

            <FormField
              label="Payment Method"
              required
            >

              <select
                value={
                  form.payment_method
                }
                onChange={event =>
                  updateForm(
                    "payment_method",
                    event.target.value
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


            {/* REFERENCE */}

            <FormField
              label="Reference Number"
            >

              <input
                value={
                  form.reference_number
                }
                onChange={event =>
                  updateForm(
                    "reference_number",
                    event.target.value
                  )
                }
                className={inputClass}
                placeholder="Transaction / cheque reference"
              />

            </FormField>


            {/* DESCRIPTION */}

            <div className="md:col-span-2">

              <FormField
                label="Description"
              >

                <input
                  value={
                    form.description
                  }
                  onChange={event =>
                    updateForm(
                      "description",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="Description of the expense"
                />

              </FormField>

            </div>


            {/* NOTES */}

            <div className="md:col-span-2">

              <FormField
                label="Notes"
              >

                <textarea
                  value={
                    form.notes
                  }
                  onChange={event =>
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


          {/* ACTIONS */}

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
              onClick={saveExpense}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving
                ? editingExpense
                  ? "Updating..."
                  : "Saving..."
                : editingExpense
                  ? "Update Expense"
                  : "Save Draft"}

            </button>

          </div>

        </Modal>
      )}

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="flex flex-col gap-3 md:flex-row">

          <input
            type="text"
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search expense, category or reference..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />


          <select
            value={statusFilter}
            onChange={event =>
              setStatusFilter(
                event.target.value as
                  | "ALL"
                  | ExpenseStatus
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
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


      {/* =====================================================
          EXPENSE TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="overflow-x-auto">

          <table className="min-w-full text-left text-sm">

            <thead className="bg-slate-50 text-xs uppercase text-slate-500">

              <tr>

                <th className="px-5 py-3">
                  Expense
                </th>

                <th className="px-5 py-3">
                  Category
                </th>

                <th className="px-5 py-3">
                  Date
                </th>

                <th className="px-5 py-3">
                  Method
                </th>

                <th className="px-5 py-3">
                  Status
                </th>

                <th className="px-5 py-3 text-right">
                  Amount
                </th>

                <th className="px-5 py-3 text-right">
                  Actions
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
                    Loading expenses...
                  </td>

                </tr>

              ) : filteredExpenses.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No expenses found.
                  </td>

                </tr>

              ) : (

                filteredExpenses.map(
                  expense => (

                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50"
                    >

                      {/* EXPENSE */}

                      <td className="px-5 py-4">

                        <button
                          type="button"
                          onClick={() =>
                            openViewExpense(
                              expense
                            )
                          }
                          className="text-left"
                        >

                          <div className="font-medium text-slate-900 hover:text-slate-600">

                            {
                              expense.expense_number
                            }

                          </div>


                          {expense.description && (

                            <div className="mt-0.5 text-xs text-slate-400">

                              {
                                expense.description
                              }

                            </div>

                          )}

                        </button>

                      </td>


                      {/* CATEGORY */}

                      <td className="px-5 py-4">

                        {
                          expense.category_name
                        }

                      </td>


                      {/* DATE */}

                      <td className="px-5 py-4">

                        {
                          expense.expense_date
                        }

                      </td>


                      {/* METHOD */}

                      <td className="px-5 py-4">

                        {
                          expense.payment_method_display
                        }

                      </td>


                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <StatusBadge
                          status={
                            expense.status
                          }
                          label={
                            expense.status_display
                          }
                        />

                      </td>


                      {/* AMOUNT */}

                      <td className="px-5 py-4 text-right font-medium">

                        ₹
                        {formatAmount(
                          expense.amount
                        )}

                      </td>


                      {/* ACTIONS */}

                      <td className="px-5 py-4">

                        <div className="flex justify-end gap-2">

                          {/* VIEW */}

                          <button
                            type="button"
                            onClick={() =>
                              openViewExpense(
                                expense
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>


                          {/* DRAFT ACTIONS */}

                          {expense.status ===
                            "DRAFT" && (

                            <>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditForm(
                                    expense
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>


                              <button
                                type="button"
                                disabled={
                                  completingId ===
                                    expense.id ||
                                  cancellingId ===
                                    expense.id
                                }
                                onClick={() =>
                                  completeExpense(
                                    expense
                                  )
                                }
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                {completingId ===
                                expense.id
                                  ? "Completing..."
                                  : "Complete"}

                              </button>


                              <button
                                type="button"
                                disabled={
                                  completingId ===
                                    expense.id ||
                                  cancellingId ===
                                    expense.id
                                }
                                onClick={() =>
                                  cancelExpense(
                                    expense
                                  )
                                }
                                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                {cancellingId ===
                                expense.id
                                  ? "Cancelling..."
                                  : "Cancel"}

                              </button>

                            </>

                          )}


                          {/* COMPLETED */}

                          {expense.status ===
                            "COMPLETED" && (

                            <span className="self-center text-xs font-medium text-green-600">
                              Completed
                            </span>

                          )}


                          {/* CANCELLED */}

                          {expense.status ===
                            "CANCELLED" && (

                            <span className="self-center text-xs font-medium text-red-600">
                              Cancelled
                            </span>

                          )}

                        </div>

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
          VIEW EXPENSE MODAL
      ===================================================== */}

      {viewingExpense && (

        <Modal
          open={true}
          onClose={closeViewExpense}
          title="Expense Details"
          description={viewingExpense.expense_number}
          maxWidth="max-w-2xl"
        >
            {/* CONTENT */}

            <div className="space-y-6 p-6">

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <DetailItem
                  label="Expense Number"
                  value={
                    viewingExpense.expense_number
                  }
                />

                <DetailItem
                  label="Expense Date"
                  value={
                    viewingExpense.expense_date
                  }
                />

                <DetailItem
                  label="Category"
                  value={
                    viewingExpense.category_name
                  }
                />

                <DetailItem
                  label="Payment Method"
                  value={
                    viewingExpense.payment_method_display
                  }
                />

                <DetailItem
                  label="Amount"
                  value={`₹${formatAmount(
                    viewingExpense.amount
                  )}`}
                  strong
                />

                <div>

                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <StatusBadge
                    status={
                      viewingExpense.status
                    }
                    label={
                      viewingExpense.status_display
                    }
                  />

                </div>

              </div>


              <DetailSection
                label="Description"
                value={
                  viewingExpense.description
                }
              />


              <DetailSection
                label="Reference Number"
                value={
                  viewingExpense.reference_number ||
                  "—"
                }
              />


              <DetailSection
                label="Notes"
                value={
                  viewingExpense.notes ||
                  "—"
                }
              />


              <div className="border-t border-slate-200 pt-5">

                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Audit Information
                </h3>


                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <DetailItem
                    label="Created By"
                    value={
                      viewingExpense.created_by_name ||
                      "System"
                    }
                  />

                  <DetailItem
                    label="Created At"
                    value={
                      formatDateTime(
                        viewingExpense.created_at
                      )
                    }
                  />

                  <DetailItem
                    label="Updated By"
                    value={
                      viewingExpense.updated_by_name ||
                      "System"
                    }
                  />

                  <DetailItem
                    label="Updated At"
                    value={
                      formatDateTime(
                        viewingExpense.updated_at
                      )
                    }
                  />

                </div>

              </div>

            </div>


            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

              {viewingExpense.status ===
                "DRAFT" && (

                <>

                  <button
                    type="button"
                    onClick={() => {

                      const expense =
                        viewingExpense;

                      closeViewExpense();

                      openEditForm(
                        expense
                      );

                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>


                  <button
                    type="button"
                    onClick={() => {

                      const expense =
                        viewingExpense;

                      closeViewExpense();

                      completeExpense(
                        expense
                      );

                    }}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Complete
                  </button>

                </>

              )}


              <button
                type="button"
                onClick={closeViewExpense}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>

            </div>

        </Modal>

      )}

    </div>

  );
}


// =========================================================
// SUMMARY CARD
// =========================================================

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

    <div className="rounded-xl border border-slate-200 bg-white p-5">

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        ₹
        {formatAmount(
          amount
        )}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>

    </div>

  );

}


// =========================================================
// FORM FIELD
// =========================================================

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

      <label className="mb-1 block text-sm font-medium text-slate-700">

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


// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({
  status,
  label,
}: {
  status: ExpenseStatus;
  label: string;
}) {

  const className =
    status === "COMPLETED"
      ? "bg-green-100 text-green-700"
      : status === "CANCELLED"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";


  return (

    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>

  );

}


// =========================================================
// DETAIL ITEM
// =========================================================

function DetailItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {

  return (

    <div>

      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={
          strong
            ? "text-lg font-bold text-slate-900"
            : "text-sm font-medium text-slate-700"
        }
      >
        {value}
      </p>

    </div>

  );

}


// =========================================================
// DETAIL SECTION
// =========================================================

function DetailSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div>

      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {value || "—"}
      </div>

    </div>

  );

}


// =========================================================
// FORMAT DATE TIME
// =========================================================

function formatDateTime(
  value: string
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

}


// =========================================================
// FORMAT AMOUNT
// =========================================================

function formatAmount(
  value: number | string
) {

  const amount =
    Number(value);


  if (
    !Number.isFinite(amount)
  ) {

    return "0.00";

  }


  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

}
