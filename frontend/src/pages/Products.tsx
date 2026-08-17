import { useEffect, useState } from "react";
import {
  Edit,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";

import api from "../services/api";
import type {
  Product,
  ProductFormData,
} from "../types/product";


const emptyForm: ProductFormData = {
  hsn_code: "",
  name: "",
  grade: "",

  cartons_per_unit: 1,
  boxes_per_carton: 1,
  pieces_per_box: 1,

  purchase_rate_per_piece: 0,
  box_purchase_rate: 0,
  box_retail_rate: 0,

  bill_rate: 0,
  retail_rate: 0,
  new_retail_rate: 0,
  mrp: 0,

  status: "ACTIVE",
};


export default function Products() {

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<ProductFormData>(emptyForm);

  const [saving, setSaving] = useState(false);


  const fetchProducts = async () => {

    try {

      setLoading(true);
      setError("");

      const response = await api.get("/products/", {
        params: search
          ? { search }
          : {},
      });

      setProducts(response.data.results);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to load products. Make sure the Django server is running."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);

  }, [search]);


  const openCreateModal = () => {

    setEditingProduct(null);

    setForm(emptyForm);

    setShowModal(true);
  };


  const openEditModal = (product: Product) => {

    setEditingProduct(product);

    setForm({
      hsn_code: product.hsn_code,
      name: product.name,
      grade: product.grade ?? "",

      cartons_per_unit: product.cartons_per_unit,
      boxes_per_carton: product.boxes_per_carton,
      pieces_per_box: product.pieces_per_box,

      purchase_rate_per_piece:
        Number(product.purchase_rate_per_piece),

      box_purchase_rate:
        Number(product.box_purchase_rate),

      box_retail_rate:
        Number(product.box_retail_rate),

      bill_rate:
        Number(product.bill_rate),

      retail_rate:
        Number(product.retail_rate),

      new_retail_rate:
        Number(product.new_retail_rate),

      mrp:
        Number(product.mrp),

      status: product.status,
    });

    setShowModal(true);
  };


  const closeModal = () => {

    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };


  const updateField = (
    field: keyof ProductFormData,
    value: string | number
  ) => {

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  const saveProduct = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // -----------------------------
    // Basic text validation
    // -----------------------------

    if (!form.hsn_code.trim()) {
      setError("HSN Code is required.");
      return;
    }

    if (!form.name.trim()) {
      setError("Product Name is required.");
      return;
    }

    // -----------------------------
    // Quantity validation
    // Must be greater than 0
    // -----------------------------

    if (form.cartons_per_unit <= 0) {
      setError("Cartons per Unit must be greater than 0.");
      return;
    }

    if (form.boxes_per_carton <= 0) {
      setError("Boxes per Carton must be greater than 0.");
      return;
    }

    if (form.pieces_per_box <= 0) {
      setError("Pieces per Box must be greater than 0.");
      return;
    }

    // -----------------------------
    // Money validation
    // Can be 0, but cannot be negative
    // -----------------------------

    const moneyFields = [
      {
        label: "Purchase Rate per Piece",
        value: form.purchase_rate_per_piece,
      },
      {
        label: "Box Purchase Rate",
        value: form.box_purchase_rate,
      },
      {
        label: "Box Retail Rate",
        value: form.box_retail_rate,
      },
      {
        label: "Bill Rate",
        value: form.bill_rate,
      },
      {
        label: "Retail Rate",
        value: form.retail_rate,
      },
      {
        label: "New Retail Rate",
        value: form.new_retail_rate,
      },
      {
        label: "MRP",
        value: form.mrp,
      },
    ];

    for (const field of moneyFields) {
      if (field.value < 0) {
        setError(
          `${field.label} cannot be negative.`
        );
        return;
      }
    }

    // -----------------------------
    // Submit to backend
    // -----------------------------

    try {
      setSaving(true);

      if (editingProduct) {
        await api.put(
          `/products/${editingProduct.id}/`,
          form
        );

        setSuccess(
          `Product "${form.name}" updated successfully.`
        );
      } else {
        await api.post(
          "/products/",
          form
        );
      }
      
      setSuccess(
        `Product "${form.name}" created successfully.`
      );

      closeModal();

      await fetchProducts();

    } catch (error: any) {
      console.error(error);

      const data =
        error?.response?.data;

      if (data) {
        const messages =
          Object.entries(data)
            .map(
              ([field, message]) =>
                `${field}: ${message}`
            )
            .join(" | ");

        setError(messages);
      } else {
        setError(
          "Unable to save product."
        );
      }

    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="space-y-6">

      {/* Page Header */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your product master and pricing
          </p>

        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Product
        </button>

      </div>


      {/* Error */}

      {error && (

        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>

      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}


      {/* Search */}

      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="relative max-w-md">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by product, HSN or grade..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400"
          />

        </div>

      </div>


      {/* Product Table */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="border-b border-slate-200 px-6 py-4">

          <div className="flex items-center gap-2">

            <Package
              size={18}
              className="text-slate-500"
            />

            <h2 className="font-semibold text-slate-900">
              Product Master
            </h2>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {products.length}
            </span>

          </div>

        </div>


        {loading ? (

          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Loading products...
          </div>

        ) : products.length === 0 ? (

          <div className="flex h-64 flex-col items-center justify-center">

            <Package
              size={42}
              className="text-slate-300"
            />

            <p className="mt-3 font-medium text-slate-600">
              No products found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Add your first product to get started.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-6 py-3">
                    Product
                  </th>

                  <th className="px-6 py-3">
                    HSN
                  </th>

                  <th className="px-6 py-3">
                    Grade
                  </th>

                  <th className="px-6 py-3 text-right">
                    Bill Rate
                  </th>

                  <th className="px-6 py-3 text-right">
                    Retail Rate
                  </th>

                  <th className="px-6 py-3 text-right">
                    MRP
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

                {products.map((product) => (

                  <tr
                    key={product.id}
                    className="transition hover:bg-slate-50"
                  >

                    <td className="px-6 py-4">

                      <div className="font-medium text-slate-900">
                        {product.name}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-400">
                        {product.pieces_per_box} pcs / box
                      </div>

                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {product.hsn_code}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {product.grade || "-"}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-700">
                      ₹{Number(product.bill_rate).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right text-slate-700">
                      ₹{Number(product.retail_rate).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      ₹{Number(product.mrp).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">

                      <span
                        className={
                          product.status === "ACTIVE"
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                        }
                      >
                        {product.status === "ACTIVE"
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </td>

                    <td className="px-6 py-4">

                      <button
                        onClick={() =>
                          openEditModal(product)
                        }
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Edit size={17} />
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* Modal */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-semibold text-slate-900">
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter product master and pricing information
                </p>

              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={saveProduct}
              className="space-y-6 p-6"
            >

              {/* Basic Information */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Basic Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <FormInput
                    label="HSN Code"
                    value={form.hsn_code}
                    onChange={(value) =>
                      updateField("hsn_code", value)
                    }
                    required
                  />

                  <FormInput
                    label="Product Name"
                    value={form.name}
                    onChange={(value) =>
                      updateField("name", value)
                    }
                    required
                  />

                  <FormInput
                    label="Grade"
                    value={form.grade}
                    onChange={(value) =>
                      updateField("grade", value)
                    }
                  />

                  <FormInput
                    label="Pieces / Box"
                    type="number"
                    value={form.pieces_per_box}
                    onChange={(value) =>
                      updateField(
                        "pieces_per_box",
                        Number(value)
                      )
                    }
                  />

                </div>

              </section>


              {/* Packaging */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Packaging
                </h3>

                <div className="grid gap-4 sm:grid-cols-3">

                  <FormInput
                    label="Cartons / Unit"
                    type="number"
                    min="1"
                    step="1"
                    value={form.cartons_per_unit}
                    onChange={(value) =>
                      updateField(
                        "cartons_per_unit",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="Boxes / Carton"
                    type="number"
                    min="1"
                    step="1"
                    value={form.boxes_per_carton}
                    onChange={(value) =>
                      updateField(
                        "boxes_per_carton",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="Pieces / Box"
                    type="number"
                    min="1"
                    step="1"
                    value={form.pieces_per_box}
                    onChange={(value) =>
                      updateField(
                        "pieces_per_box",
                        Number(value)
                      )
                    }
                  />

                </div>

              </section>


              {/* Pricing */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Pricing
                </h3>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                  <FormInput
                    label="Purchase / Piece"
                    type="number"
                    step="0.01"
                    value={form.purchase_rate_per_piece}
                    onChange={(value) =>
                      updateField(
                        "purchase_rate_per_piece",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="Box Purchase Rate"
                    type="number"
                    step="0.01"
                    value={form.box_purchase_rate}
                    onChange={(value) =>
                      updateField(
                        "box_purchase_rate",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="Box Retail Rate"
                    type="number"
                    step="0.01"
                    value={form.box_retail_rate}
                    onChange={(value) =>
                      updateField(
                        "box_retail_rate",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="Bill Rate"
                    type="number"
                    step="0.01"
                    value={form.bill_rate}
                    onChange={(value) =>
                      updateField(
                        "bill_rate",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="Retail Rate"
                    type="number"
                    step="0.01"
                    value={form.retail_rate}
                    onChange={(value) =>
                      updateField(
                        "retail_rate",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="New Retail Rate"
                    type="number"
                    step="0.01"
                    value={form.new_retail_rate}
                    onChange={(value) =>
                      updateField(
                        "new_retail_rate",
                        Number(value)
                      )
                    }
                  />

                  <FormInput
                    label="MRP"
                    type="number"
                    step="0.01"
                    value={form.mrp}
                    onChange={(value) =>
                      updateField(
                        "mrp",
                        Number(value)
                      )
                    }
                  />

                </div>

              </section>


              {/* Status */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Status
                </h3>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as
                        | "ACTIVE"
                        | "INACTIVE"
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>

              </section>


              {/* Actions */}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
                    : editingProduct
                      ? "Update Product"
                      : "Create Product"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


interface FormInputProps {
  label: string;
  value: string | number;
  type?: string;
  min?: string;
  step?: string;
  required?: boolean;
  onChange: (value: string) => void;
}


function FormInput({
  label,
  value,
  type = "text",
  min,
  step,
  required = false,
  onChange,
}: FormInputProps) {

  return (
    <div>

      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        min={min}
        step={step}
        required={required}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />

    </div>
  );
}