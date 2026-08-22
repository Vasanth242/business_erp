import { useEffect, useState } from "react";

import {
  Edit,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Unlock,
  UserCog,
  Users as UsersIcon,
} from "lucide-react";

import api from "../services/api";

import Modal from "../components/common/Modal";


/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface Role {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}


interface PasswordPolicy {
  id: number;
  name: string;
  min_length: number;
  expiry_days: number;
  idle_days: number;
  password_history: number;
  session_timeout: number;
  is_active: boolean;
}


interface User {
  id: number;

  username: string;

  first_name?: string;

  last_name?: string;

  email?: string;

  is_active: boolean;

  is_superuser: boolean;

  is_locked: boolean;

  role?: number | null;

  role_name?: string | null;

  password_policy?: number | null;

  password_policy_name?: string | null;

  last_login_at?: string | null;

  created_at?: string;

  updated_at?: string;
}


interface UserForm {
  username: string;

  first_name: string;

  last_name: string;

  email: string;

  password: string;

  confirm_password: string;

  is_active: boolean;

  role: number | null;

  password_policy: number | null;
}


/*
|--------------------------------------------------------------------------
| EMPTY FORM
|--------------------------------------------------------------------------
*/

const emptyForm: UserForm = {
  username: "",

  first_name: "",

  last_name: "",

  email: "",

  password: "",

  confirm_password: "",

  is_active: true,

  role: null,

  password_policy: null,
};


/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function Users() {

  const [users, setUsers] =
    useState<User[]>([]);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [passwordPolicies, setPasswordPolicies] =
    useState<PasswordPolicy[]>([]);


  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  const [search, setSearch] =
    useState("");


  const [showModal, setShowModal] =
    useState(false);


  const [editingUser, setEditingUser] =
    useState<User | null>(null);


  const [form, setForm] =
    useState<UserForm>(emptyForm);


  /*
  |--------------------------------------------------------------------------
  | LOAD DATA
  |--------------------------------------------------------------------------
  */

  async function loadData() {

    try {

      setLoading(true);

      setError("");


      const [
        usersResponse,
        rolesResponse,
        policiesResponse,
      ] = await Promise.all([

        api.get("/auth/users/"),

        api.get("/auth/roles/"),

        api.get("/auth/password-policies/"),

      ]);


      setUsers(
        usersResponse.data.results ??
        usersResponse.data
      );


      setRoles(
        rolesResponse.data.results ??
        rolesResponse.data
      );


      setPasswordPolicies(
        policiesResponse.data.results ??
        policiesResponse.data
      );


    } catch (err: any) {

      console.error(err);


      setError(
        err?.response?.data?.detail ||
        "Unable to load users."
      );


    } finally {

      setLoading(false);

    }

  }

    /*
    |--------------------------------------------------------------------------
    | INITIAL LOAD
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
    loadData();
    }, []);


  /*
  |--------------------------------------------------------------------------
  | CREATE MODAL
  |--------------------------------------------------------------------------
  */

  function openCreateModal() {

    setEditingUser(null);

    setForm(emptyForm);

    setError("");

    setSuccess("");

    setShowModal(true);

  }


  /*
  |--------------------------------------------------------------------------
  | EDIT MODAL
  |--------------------------------------------------------------------------
  */

  function openEditModal(user: User) {

    setEditingUser(user);


    setForm({

      username:
        user.username ?? "",

      first_name:
        user.first_name ?? "",

      last_name:
        user.last_name ?? "",

      email:
        user.email ?? "",

      /*
       * Never load an existing
       * password into the form.
       */

      password: "",

      confirm_password: "",

      is_active:
        user.is_active,

      role:
        user.role ?? null,

      password_policy:
        user.password_policy ?? null,

    });


    setError("");

    setSuccess("");

    setShowModal(true);

  }


  /*
  |--------------------------------------------------------------------------
  | CLOSE MODAL
  |--------------------------------------------------------------------------
  */

  function closeModal() {

    if (saving) {

      return;

    }


    setShowModal(false);

    setEditingUser(null);

    setForm(emptyForm);

  }


  /*
  |--------------------------------------------------------------------------
  | UPDATE FIELD
  |--------------------------------------------------------------------------
  */

  function updateField(
    field: keyof UserForm,
    value:
      | string
      | boolean
      | number
      | null
  ) {

    setForm((previous) => ({

      ...previous,

      [field]: value,

    }));

  }


  /*
  |--------------------------------------------------------------------------
  | SAVE USER
  |--------------------------------------------------------------------------
  */

  async function saveUser(
    event: React.FormEvent
  ) {

    event.preventDefault();


    setError("");

    setSuccess("");


    /*
    |--------------------------------------------------------------------------
    | BASIC VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!form.username.trim()) {

      setError(
        "Username is required."
      );

      return;

    }


    if (!editingUser && !form.password) {

      setError(
        "Password is required for a new user."
      );

      return;

    }


    /*
    |--------------------------------------------------------------------------
    | PASSWORD CONFIRMATION
    |--------------------------------------------------------------------------
    */

    if (
      form.password &&
      form.password !==
        form.confirm_password
    ) {

      setError(
        "Passwords do not match."
      );

      return;

    }


    /*
    |--------------------------------------------------------------------------
    | ROLE
    |--------------------------------------------------------------------------
    */

    if (!form.role) {

      setError(
        "Please select a role."
      );

      return;

    }


    /*
    |--------------------------------------------------------------------------
    | PASSWORD POLICY
    |--------------------------------------------------------------------------
    */

    if (!form.password_policy) {

      setError(
        "Please select a password policy."
      );

      return;

    }


    try {

      setSaving(true);


      /*
      |--------------------------------------------------------------------------
      | CREATE
      |--------------------------------------------------------------------------
      */

      if (!editingUser) {

        const payload: Record<
          string,
          unknown
        > = {

          username:
            form.username.trim(),

          first_name:
            form.first_name.trim(),

          last_name:
            form.last_name.trim(),

          email:
            form.email.trim(),

          password:
            form.password,

          is_active:
            form.is_active,

          role:
            form.role,

          password_policy:
            form.password_policy,

        };


        await api.post(
          "/auth/users/",
          payload
        );


        setSuccess(
          `User "${form.username}" created successfully.`
        );

      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE
      |--------------------------------------------------------------------------
      */

      else {

        const payload: Record<string, unknown> = {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim(),
            is_active: form.is_active,
            role: form.role,
            password_policy: form.password_policy,
        };

        /*
        * Update user details.
        */
        await api.put(
            `/auth/users/${editingUser.id}/`,
            payload
        );

        /*
        * Change password only when
        * administrator entered a new password.
        */
        if (form.password) {

            await api.post(
            `/auth/users/${editingUser.id}/reset-password/`,
            {
                password: form.password,
                password_confirm: form.confirm_password,
            }
            );
        }

        setSuccess(
            `User "${form.username}" updated successfully.`
        );
        }


      closeModal();

      await loadData();


    } catch (err: any) {

      console.error(err);


      const data =
        err?.response?.data;


      if (data) {

        if (
          typeof data === "string"
        ) {

          setError(data);

        }

        else {

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


          setError(
            messages ||
            "Unable to save user."
          );

        }

      }

      else {

        setError(
          "Unable to save user."
        );

      }


    } finally {

      setSaving(false);

    }

  }


  /*
  |--------------------------------------------------------------------------
  | DEACTIVATE USER
  |--------------------------------------------------------------------------
  */

  async function deactivateUser(
    user: User
  ) {

    if (
      !window.confirm(
        `Deactivate user "${user.username}"?`
      )
    ) {

      return;

    }


    try {

      setError("");

      setSuccess("");


      await api.delete(
        `/auth/users/${user.id}/`
      );


      setSuccess(
        `User "${user.username}" deactivated successfully.`
      );


      await loadData();


    } catch (err: any) {

      console.error(err);


      setError(
        err?.response?.data?.detail ||
        "Unable to deactivate user."
      );

    }

  }


  /*
  |--------------------------------------------------------------------------
  | UNLOCK USER
  |--------------------------------------------------------------------------
  */

  async function unlockUser(
    user: User
  ) {

    if (
      !window.confirm(
        `Unlock user "${user.username}"?`
      )
    ) {

      return;

    }


    try {

      setError("");

      setSuccess("");


      await api.post(
        `/auth/users/${user.id}/unlock/`
      );


      setSuccess(
        `User "${user.username}" unlocked successfully.`
      );


      await loadData();


    } catch (err: any) {

      console.error(err);


      setError(
        err?.response?.data?.detail ||
        "Unable to unlock user."
      );

    }

  }


  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredUsers =
    users.filter((user) => {

      const query =
        search
          .toLowerCase()
          .trim();


      if (!query) {

        return true;

      }


      return (

        user.username
          ?.toLowerCase()
          .includes(query)

        ||

        user.first_name
          ?.toLowerCase()
          .includes(query)

        ||

        user.last_name
          ?.toLowerCase()
          .includes(query)

        ||

        user.email
          ?.toLowerCase()
          .includes(query)

        ||

        user.role_name
          ?.toLowerCase()
          .includes(query)

      );

    });


  /*
  |--------------------------------------------------------------------------
  | ROLE NAME
  |--------------------------------------------------------------------------
  */

  function getRoleName(
    user: User
  ) {

    if (user.role_name) {

      return user.role_name;

    }


    return (
      roles.find(
        (role) =>
          role.id === user.role
      )?.name ||
      "-"
    );

  }


  /*
  |--------------------------------------------------------------------------
  | POLICY NAME
  |--------------------------------------------------------------------------
  */

  function getPolicyName(
    user: User
  ) {

    if (user.password_policy_name) {

      return user.password_policy_name;

    }


    return (
      passwordPolicies.find(
        (policy) =>
          policy.id ===
          user.password_policy
      )?.name ||
      "-"
    );

  }


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (

    <div className="space-y-6">


      {/* ================================================================
          HEADER
      ================================================================ */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Users
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage system users, roles and password policies
          </p>

        </div>


        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >

          <Plus size={18} />

          Add User

        </button>

      </div>


      {/* ================================================================
          MESSAGES
      ================================================================ */}

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


      {/* ================================================================
          SEARCH
      ================================================================ */}

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
            placeholder="Search username, name, email or role..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
          />

        </div>

      </div>


      {/* ================================================================
          TABLE
      ================================================================ */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">


        <div className="border-b border-slate-200 px-6 py-4">

          <div className="flex items-center gap-2">

            <UsersIcon
              size={18}
              className="text-slate-500"
            />

            <h2 className="font-semibold text-slate-900">
              User Master
            </h2>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">

              {filteredUsers.length}

            </span>

          </div>

        </div>


        {loading ? (

          <div className="flex h-64 items-center justify-center text-sm text-slate-400">

            Loading users...

          </div>

        ) : filteredUsers.length === 0 ? (

          <div className="flex h-64 flex-col items-center justify-center">

            <UsersIcon
              size={42}
              className="text-slate-300"
            />

            <p className="mt-3 font-medium text-slate-600">
              No users found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Create your first user to get started.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-275 text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-6 py-3">
                    User
                  </th>

                  <th className="px-6 py-3">
                    Email
                  </th>

                  <th className="px-6 py-3">
                    Role
                  </th>

                  <th className="px-6 py-3">
                    Password Policy
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

                {filteredUsers.map(
                  (user) => (

                    <tr
                      key={user.id}
                      className="hover:bg-slate-50"
                    >

                      {/* User */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">

                            <UserCog
                              size={18}
                              className="text-slate-500"
                            />

                          </div>

                          <div>

                            <div className="font-medium text-slate-900">

                              {user.username}

                            </div>

                            <div className="text-xs text-slate-400">

                              {[
                                user.first_name,
                                user.last_name,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                                "No name"}

                            </div>

                          </div>

                        </div>

                      </td>


                      {/* Email */}

                      <td className="px-6 py-4 text-slate-600">

                        {user.email || "-"}

                      </td>


                      {/* Role */}

                      <td className="px-6 py-4">

                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">

                          <ShieldCheck size={13} />

                          {getRoleName(user)}

                        </span>

                      </td>


                      {/* Password Policy */}

                      <td className="px-6 py-4 text-slate-600">

                        {getPolicyName(user)}

                      </td>


                      {/* Status */}

                      <td className="px-6 py-4">

                        {!user.is_active ? (

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">

                            Inactive

                          </span>

                        ) : user.is_locked ? (

                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">

                            <Lock size={12} />

                            Locked

                          </span>

                        ) : (

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">

                            Active

                          </span>

                        )}

                      </td>


                      {/* Actions */}

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-1">

                          <button
                            onClick={() =>
                              openEditModal(user)
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit user"
                          >

                            <Edit size={17} />

                          </button>


                          {user.is_locked && (

                            <button
                              onClick={() =>
                                unlockUser(user)
                              }
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                              title="Unlock user"
                            >

                              <Unlock size={17} />

                            </button>

                          )}


                          {user.is_active && (

                            <button
                              onClick={() =>
                                deactivateUser(user)
                              }
                              className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              title="Deactivate user"
                            >

                              Disable

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


      {/* ================================================================
          CREATE / EDIT MODAL
      ================================================================ */}

        <Modal
            open={showModal}
            onClose={closeModal}
            title={
                editingUser
                ? "Edit User"
                : "Add User"
            }
            description="Configure user account, role and password policy"
            maxWidth="max-w-3xl"
        >
            <form
                onSubmit={saveUser}
                className="space-y-6 p-6"
            >

              {/* ======================================================
                  ACCOUNT
              ====================================================== */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">

                  Account Information

                </h3>


                <div className="grid gap-4 sm:grid-cols-2">


                  {/* Username */}

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      Username

                    </label>

                    <input
                      value={form.username}
                      onChange={(event) =>
                        updateField(
                          "username",
                          event.target.value
                        )
                      }
                      required
                      disabled={Boolean(editingUser)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                    />

                    {editingUser && (

                      <p className="mt-1 text-xs text-slate-400">

                        Username cannot be changed here.

                      </p>

                    )}

                  </div>


                  {/* Email */}

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      Email

                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField(
                          "email",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                  </div>


                  {/* First Name */}

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      First Name

                    </label>

                    <input
                      value={form.first_name}
                      onChange={(event) =>
                        updateField(
                          "first_name",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                  </div>


                  {/* Last Name */}

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      Last Name

                    </label>

                    <input
                      value={form.last_name}
                      onChange={(event) =>
                        updateField(
                          "last_name",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                  </div>

                </div>

              </section>


              {/* ======================================================
                  PASSWORD
              ====================================================== */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">

                  Password

                </h3>


                <div className="grid gap-4 sm:grid-cols-2">


                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      {editingUser
                        ? "New Password"
                        : "Password"}

                    </label>

                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        updateField(
                          "password",
                          event.target.value
                        )
                      }
                      required={!editingUser}
                      placeholder={
                        editingUser
                          ? "Leave blank to keep current password"
                          : "Enter password"
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                  </div>


                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      Confirm Password

                    </label>

                    <input
                      type="password"
                      value={form.confirm_password}
                      onChange={(event) =>
                        updateField(
                          "confirm_password",
                          event.target.value
                        )
                      }
                      required={
                        !editingUser ||
                        Boolean(form.password)
                      }
                      placeholder="Confirm password"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    />

                  </div>

                </div>

              </section>


              {/* ======================================================
                  ACCESS
              ====================================================== */}

              <section>

                <h3 className="mb-4 text-sm font-semibold text-slate-800">

                  Access & Security

                </h3>


                <div className="grid gap-4 sm:grid-cols-2">


                  {/* Role */}

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      Role

                    </label>

                    <select
                      value={
                        form.role ?? ""
                      }
                      onChange={(event) =>
                        updateField(
                          "role",
                          event.target.value
                            ? Number(
                                event.target.value
                              )
                            : null
                        )
                      }
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    >

                      <option value="">
                        Select Role
                      </option>

                      {roles
                        .filter(
                          (role) =>
                            role.is_active
                        )
                        .map(
                          (role) => (

                            <option
                              key={role.id}
                              value={role.id}
                            >
                              {role.name}
                            </option>

                          )
                        )}

                    </select>

                  </div>


                  {/* Password Policy */}

                  <div>

                    <label className="mb-1.5 block text-sm font-medium text-slate-700">

                      Password Policy

                    </label>

                    <select
                      value={
                        form.password_policy ??
                        ""
                      }
                      onChange={(event) =>
                        updateField(
                          "password_policy",
                          event.target.value
                            ? Number(
                                event.target.value
                              )
                            : null
                        )
                      }
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    >

                      <option value="">
                        Select Password Policy
                      </option>

                      {passwordPolicies
                        .filter(
                          (policy) =>
                            policy.is_active
                        )
                        .map(
                          (policy) => (

                            <option
                              key={policy.id}
                              value={policy.id}
                            >
                              {policy.name}
                            </option>

                          )
                        )}

                    </select>

                  </div>


                  {/* Status */}

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

              </section>


              {/* ======================================================
                  ACTIONS
              ====================================================== */}

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
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >

                  <KeyRound size={16} />

                  {saving
                    ? "Saving..."
                    : editingUser
                      ? "Update User"
                      : "Create User"}

                </button>

              </div>

            </form>

        </Modal>
        
    </div>

  );

}