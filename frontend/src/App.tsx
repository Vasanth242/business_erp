import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute
  from "./components/auth/ProtectedRoute";

import AppLayout
  from "./components/layout/AppLayout";

import Login from "./pages/Login";

import Roles from "./pages/Roles";

import Users from "./pages/Users";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import ExpenseCategories
  from "./pages/ExpenseCategories";
import Freezers from "./pages/Freezers";
import Claims from "./pages/Claims";
import Reconciliation
  from "./pages/Reconciliation";


function App() {

  return (
    <BrowserRouter>

      <AuthProvider>

        <Routes>

          {/* ==========================================================
              LOGIN
          ========================================================== */}

          <Route
            path="/login"
            element={<Login />}
          />


          {/* ==========================================================
              PROTECTED APPLICATION
          ========================================================== */}

          <Route
            element={<ProtectedRoute />}
          >

            <Route
              element={<AppLayout />}
            >


              {/* ======================================================
                  DASHBOARD
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="dashboard"
                  />
                }
              >

                <Route
                  path="/"
                  element={<Dashboard />}
                />

              </Route>


              {/* ======================================================
                  PRODUCTS
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="products"
                  />
                }
              >

                <Route
                  path="/products"
                  element={<Products />}
                />

              </Route>


              {/* ======================================================
                  CUSTOMERS
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="customers"
                  />
                }
              >

                <Route
                  path="/customers"
                  element={<Customers />}
                />

              </Route>


              {/* ======================================================
                  INVENTORY
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="inventory"
                  />
                }
              >

                <Route
                  path="/inventory"
                  element={<Inventory />}
                />

              </Route>


              {/* ======================================================
                  SALES
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="sales"
                  />
                }
              >

                <Route
                  path="/sales"
                  element={<Sales />}
                />

              </Route>


              {/* ======================================================
                  PURCHASES
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="purchases"
                  />
                }
              >

                <Route
                  path="/purchases"
                  element={<Purchases />}
                />

              </Route>


              {/* ======================================================
                  PAYMENTS
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="payments"
                  />
                }
              >

                <Route
                  path="/payments"
                  element={<Payments />}
                />

              </Route>


              {/* ======================================================
                  EXPENSES
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="expenses"
                  />
                }
              >

                <Route
                  path="/expenses"
                  element={<Expenses />}
                />

              </Route>


              {/* ======================================================
                  EXPENSE CATEGORIES
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="expense_categories"
                  />
                }
              >

                <Route
                  path="/expense-categories"
                  element={<ExpenseCategories />}
                />

              </Route>


              {/* ======================================================
                  FREEZERS
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="freezers"
                  />
                }
              >

                <Route
                  path="/freezers"
                  element={<Freezers />}
                />

              </Route>


              {/* ======================================================
                  CLAIMS
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="claims"
                  />
                }
              >

                <Route
                  path="/claims"
                  element={<Claims />}
                />

              </Route>


              {/* ======================================================
                  RECONCILIATION
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="reconciliation"
                  />
                }
              >

                <Route
                  path="/reconciliation"
                  element={<Reconciliation />}
                />

              </Route>

              {/* ======================================================
                  ROLES
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="roles"
                  />
                }
              >
                <Route
                  path="/roles"
                  element={<Roles />}
                />
              </Route>

              {/* ======================================================
                  USERS
              ====================================================== */}

              <Route
                element={
                  <ProtectedRoute
                    permission="users"
                  />
                }
              >
                <Route
                  path="/users"
                  element={<Users />}
                />
              </Route>

            </Route>

          </Route>


          {/* ==========================================================
              UNKNOWN URL
          ========================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>
  );
}


export default App;