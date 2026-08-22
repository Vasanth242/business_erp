import { useEffect, useState } from "react";
import {
  Edit,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import api from "../services/api";

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  permissions: number[];
  created_at: string;
  updated_at: string;
}

interface RoleForm {
  name: string;
  description: string;
  is_active: boolean;
  permissions: number[];
}

const emptyForm: RoleForm = {
  name: "",
  description: "",
  is_active: true,
  permissions: [],
};

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [form, setForm] =
    useState<RoleForm>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        rolesResponse,
        permissionsResponse,
      ] = await Promise.all([
        api.get("/auth/roles/"),
        api.get("/auth/permissions/"),
      ]);

      setRoles(
        rolesResponse.data.results ??
        rolesResponse.data
      );

      setPermissions(
        permissionsResponse.data.results ??
        permissionsResponse.data
      );

    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.detail ||
        "Unable to load roles and permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRole(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(role: Role) {
    setEditingRole(role);

    setForm({
      name: role.name,
      description: role.description ?? "",
      is_active: role.is_active,
      permissions: role.permissions ?? [],
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingRole(null);
    setForm(emptyForm);
  }

  function togglePermission(permissionId: number) {
    setForm((previous) => {
      const exists =
        previous.permissions.includes(permissionId);

      return {
        ...previous,
        permissions: exists
          ? previous.permissions.filter(
              (id) => id !== permissionId
            )
          : [
              ...previous.permissions,
              permissionId,
            ],
      };
    });
  }

  function updateField(
    field: keyof RoleForm,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveRole(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Role name is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        is_active: form.is_active,
        permissions: form.permissions,
      };

      if (editingRole) {
        await api.put(
          `/auth/roles/${editingRole.id}/`,
          payload
        );

        setSuccess(
          `Role "${form.name}" updated successfully.`
        );
      } else {
        await api.post(
          "/auth/roles/",
          payload
        );

        setSuccess(
          `Role "${form.name}" created successfully.`
        );
      }

      closeModal();

      await loadData();

    } catch (err: any) {
      console.error(err);

      const data =
        err?.response?.data;

      if (data) {
        if (typeof data === "string") {
          setError(data);
        } else {
          const messages =
            Object.entries(data)
              .map(
                ([field, message]) =>
                  `${field}: ${
                    Array.isArray(message)
                      ? message.join(", ")
                      : String(message)
                  }`
              )
              .join(" | ");

          setError(messages);
        }
      } else {
        setError(
          "Unable to save role."
        );
      }

    } finally {
      setSaving(false);
    }
  }

  async function deactivateRole(
    role: Role
  ) {
    if (
      !window.confirm(
        `Deactivate role "${role.name}"?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/auth/roles/${role.id}/`
      );

      setSuccess(
        `Role "${role.name}" deactivated successfully.`
      );

      await loadData();

    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.detail ||
        "Unable to deactivate role."
      );
    }
  }

  const filteredRoles =
    roles.filter((role) => {

      const query =
        search.toLowerCase().trim();

      if (!query) {
        return true;
      }

      return (
        role.name
          .toLowerCase()
          .includes(query) ||
        role.description
          ?.toLowerCase()
          .includes(query)
      );
    });

  function getPermissionNames(
    role: Role
  ) {
    return permissions
      .filter((permission) =>
        role.permissions.includes(
          permission.id
        )
      )
      .map(
        (permission) =>
          permission.name
      );
  }

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Roles
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage roles and their module permissions
          </p>

        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Role
        </button>

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


      {/* Search */}

      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="relative max-w-md">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search roles..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
          />

        </div>

      </div>


      {/* Table */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="border-b border-slate-200 px-6 py-4">

          <div className="flex items-center gap-2">

            <ShieldCheck
              size={18}
              className="text-slate-500"
            />

            <h2 className="font-semibold text-slate-900">
              Role Master
            </h2>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {filteredRoles.length}
            </span>

          </div>

        </div>

        {loading ? (

          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Loading roles...
          </div>

        ) : filteredRoles.length === 0 ? (

          <div className="flex h-64 flex-col items-center justify-center">

            <ShieldCheck
              size={42}
              className="text-slate-300"
            />

            <p className="mt-3 font-medium text-slate-600">
              No roles found
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-6 py-3">
                    Role
                  </th>

                  <th className="px-6 py-3">
                    Description
                  </th>

                  <th className="px-6 py-3">
                    Permissions
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

                {filteredRoles.map(
                  (role) => {

                    const permissionNames =
                      getPermissionNames(
                        role
                      );

                    return (
                      <tr
                        key={role.id}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-6 py-4">

                          <div className="font-medium text-slate-900">
                            {role.name}
                          </div>

                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {role.description || "-"}
                        </td>

                        <td className="px-6 py-4">

                          <div className="flex max-w-md flex-wrap gap-1.5">

                            {permissionNames.length === 0 ? (

                              <span className="text-xs text-slate-400">
                                No permissions
                              </span>

                            ) : (

                              permissionNames.map(
                                (name) => (
                                  <span
                                    key={name}
                                    className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                                  >
                                    {name}
                                  </span>
                                )
                              )

                            )}

                          </div>

                        </td>

                        <td className="px-6 py-4">

                          <span
                            className={
                              role.is_active
                                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                                : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                            }
                          >
                            {role.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </td>

                        <td className="px-6 py-4">

                          <div className="flex items-center gap-1">

                            <button
                              onClick={() =>
                                openEditModal(
                                  role
                                )
                              }
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit role"
                            >
                              <Edit size={17} />
                            </button>

                            {role.is_active && (
                              <button
                                onClick={() =>
                                  deactivateRole(
                                    role
                                  )
                                }
                                className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Disable
                              </button>
                            )}

                          </div>

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


      {/* Modal */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            {/* Modal header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

              <div>

                <h2 className="text-lg font-semibold text-slate-900">

                  {editingRole
                    ? "Edit Role"
                    : "Add Role"}

                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Configure role permissions
                </p>

              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={saveRole}
              className="space-y-6 p-6"
            >

              {/* Basic information */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Basic Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Role Name
                    </label>

                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField(
                          "name",
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                  </div>

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Status
                    </label>

                    <select
                      value={
                        form.is_active
                          ? "ACTIVE"
                          : "INACTIVE"
                      }
                      onChange={(event) =>
                        updateField(
                          "is_active",
                          event.target.value ===
                            "ACTIVE"
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
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

                <div className="mt-4">

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  />

                </div>

              </section>


              {/* Permissions */}

              <section>

                <div className="mb-4 flex items-center justify-between">

                  <div>

                    <h3 className="text-sm font-semibold text-slate-800">
                      Module Permissions
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Select the modules this role can access.
                    </p>

                  </div>

                  <span className="text-xs font-medium text-slate-500">
                    {form.permissions.length} selected
                  </span>

                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  {permissions.map(
                    (permission) => {

                      const checked =
                        form.permissions.includes(
                          permission.id
                        );

                      return (
                        <label
                          key={permission.id}
                          className={`
                            flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition
                            ${
                              checked
                                ? "border-slate-400 bg-slate-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }
                          `}
                        >

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              togglePermission(
                                permission.id
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />

                          <div>

                            <div className="text-sm font-medium text-slate-800">
                              {permission.name}
                            </div>

                            {permission.description && (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {permission.description}
                              </div>
                            )}

                          </div>

                        </label>
                      );
                    }
                  )}

                </div>

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
                    : editingRole
                      ? "Update Role"
                      : "Create Role"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}