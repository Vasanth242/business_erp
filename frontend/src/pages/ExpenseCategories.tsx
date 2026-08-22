import { useEffect, useState } from "react";

import api from "../services/api";
import Modal from "../components/common/Modal";


interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  created_by_name: string | null;
  updated_at: string;
  updated_by_name: string | null;
}


interface CategoryForm {
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}


const emptyForm: CategoryForm = {
  name: "",
  description: "",
  status: "ACTIVE",
};


export default function ExpenseCategories() {

  const [
    categories,
    setCategories,
  ] = useState<ExpenseCategory[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<number | null>(null);

  const [
    form,
    setForm,
  ] = useState<CategoryForm>(
    emptyForm
  );


  // =========================================================
  // LOAD CATEGORIES
  // =========================================================

  const fetchCategories = async () => {

    try {

      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/expenses/categories/"
        );

      setCategories(
        response.data.results || []
      );

    } catch (err: any) {

      console.error(
        "Unable to load expense categories:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        "Unable to load expense categories."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    fetchCategories();

  }, []);


  // =========================================================
  // FORM
  // =========================================================

  const updateForm = (
    field: keyof CategoryForm,
    value: string
  ) => {

    setForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  };


  const openCreateForm = () => {

    setEditingId(null);

    setForm({
      ...emptyForm,
    });

    setError("");
    setSuccess("");

    setShowForm(true);
  };


  const openEditForm = (
    category: ExpenseCategory
  ) => {

    setEditingId(category.id);

    setForm({
      name: category.name,
      description: category.description || "",
      status: category.status,
    });

    setError("");
    setSuccess("");

    setShowForm(true);
  };


  const closeForm = (force = false) => {
    if (saving && !force) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
  };


  // =========================================================
  // SAVE
  // =========================================================

  const saveCategory = async (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setError("");
    setSuccess("");

    const name =
      form.name.trim();

    const description =
      form.description.trim();

    if (!name) {

      setError(
        "Category name is required."
      );

      return;
    }

    try {

      setSaving(true);

      const payload = {
        name,
        description,
        status: form.status,
      };


      if (editingId === null) {

        await api.post(
          "/expenses/categories/",
          payload
        );

        setSuccess(
          "Expense category created successfully."
        );

      } else {

        await api.put(
          `/expenses/categories/${editingId}/`,
          payload
        );

        setSuccess(
          "Expense category updated successfully."
        );
      }


      closeForm(true);


      await fetchCategories();

    } catch (err: any) {

      console.error(
        "Unable to save expense category:",
        err
      );

      const data =
        err?.response?.data;

      if (
        data &&
        typeof data === "object"
      ) {

        if (data.name) {

          setError(
            Array.isArray(data.name)
              ? data.name[0]
              : data.name
          );

        } else {

          setError(
            data.detail ||
            "Unable to save expense category."
          );
        }

      } else {

        setError(
          "Unable to save expense category."
        );
      }

    } finally {

      setSaving(false);

    }
  };


  // =========================================================
  // TOGGLE STATUS
  // =========================================================

  const toggleStatus = async (
    category: ExpenseCategory
  ) => {

    const newStatus =
      category.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {

      setError("");
      setSuccess("");

      await api.patch(
        `/expenses/categories/${category.id}/`,
        {
          status: newStatus,
        }
      );

      setSuccess(
        `Category ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`
      );

      await fetchCategories();

    } catch (err: any) {

      console.error(
        "Unable to update category status:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        "Unable to update category status."
      );
    }
  };


  // =========================================================
  // DELETE
  // =========================================================

  const deleteCategory = async (
    category: ExpenseCategory
  ) => {

    const confirmed =
      window.confirm(
        `Delete "${category.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setError("");
      setSuccess("");

      await api.delete(
        `/expenses/categories/${category.id}/`
      );

      setSuccess(
        "Expense category deleted successfully."
      );

      await fetchCategories();

    } catch (err: any) {

      console.error(
        "Unable to delete category:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        "Unable to delete expense category."
      );
    }
  };


  // =========================================================
  // SEARCH
  // =========================================================

  const filteredCategories =
    categories.filter(
      category => {

        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          category.name
            .toLowerCase()
            .includes(query) ||

          category.description
            .toLowerCase()
            .includes(query)
        );
      }
    );


  // =========================================================
  // STYLES
  // =========================================================

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100";


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Expense Categories
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage categories used for business expenses.
          </p>

        </div>


        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + New Category
        </button>

      </div>


      {/* ALERTS */}

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


      {/* FORM */}

      {showForm && (

          <Modal
            open={showForm}
            onClose={closeForm}
            title={
              editingId === null
                ? "Add Expense Category"
                : "Edit Expense Category"
            }
            description="Create or update an expense category."
            maxWidth="max-w-2xl"
          >


          <form
            onSubmit={saveCategory}
            className="space-y-5 p-6"
          >

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Category Name
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  value={form.name}
                  onChange={event =>
                    updateForm(
                      "name",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="Electricity"
                  disabled={saving}
                  maxLength={150}
                />

              </div>


              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={event =>
                    updateForm(
                      "status",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  disabled={saving}
                >

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>

                </select>

              </div>

            </div>


            <div>

              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={event =>
                  updateForm(
                    "description",
                    event.target.value
                  )
                }
                className={`${inputClass} min-h-25 resize-y`}
                placeholder="Describe this expense category..."
                disabled={saving}
              />

            </div>


            <div className="-mx-6 -mb-6 flex justify-end gap-3 border-t border-slate-200 px-6 py-5">

              <button
                type="button"
                onClick={() => closeForm()}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>


              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {saving
                  ? "Saving..."
                  : editingId === null
                    ? "Create Category"
                    : "Save Changes"}

              </button>

            </div>

          </form>

        </Modal>
      )}


      {/* SEARCH */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="relative max-w-md">

          <input
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
            className={inputClass}
            placeholder="Search categories..."
          />

        </div>

      </div>


      {/* TABLE */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="border-b border-slate-200 bg-slate-50">

              <tr>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr>

                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    Loading categories...
                  </td>

                </tr>

              ) : filteredCategories.length === 0 ? (

                <tr>

                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center"
                  >

                    <p className="text-sm font-medium text-slate-700">
                      No expense categories found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Create your first expense category to get started.
                    </p>

                  </td>

                </tr>

              ) : (

                filteredCategories.map(
                  category => (

                    <tr
                      key={category.id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-5 py-4">

                        <div className="font-medium text-slate-900">
                          {category.name}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="max-w-md text-sm text-slate-600">

                          {category.description || "—"}

                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={
                            category.status === "ACTIVE"
                              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                          }
                        >

                          {category.status === "ACTIVE"
                            ? "Active"
                            : "Inactive"}

                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                category
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(
                                category
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >

                            {category.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}

                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              deleteCategory(
                                category
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>

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

    </div>
  );
}