import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import ExpenseCategories from "./pages/ExpenseCategories";
import Freezers from "./pages/Freezers";
import Claims from "./pages/Claims";
import Reconciliation from "./pages/Reconciliation";


function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          element={<AppLayout />}
        >

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/products"
            element={<Products />}
          />

          <Route
            path="/customers"
            element={<Customers />}
          />

          <Route
            path="/inventory"
            element={<Inventory />}
          />

          <Route
            path="/sales"
            element={<Sales />}
          />

          <Route
            path="/purchases"
            element={<Purchases />}
          />

          <Route
            path="/payments"
            element={<Payments />}
          />

          <Route
            path="/expenses"
            element={<Expenses />}
          />

          <Route
            path="/expense-categories"
            element={<ExpenseCategories />}
          />

          <Route
            path="/freezers"
            element={<Freezers />}
          />

          <Route
            path="/claims"
            element={<Claims />}
          />

          <Route
            path="/reconciliation"
            element={<Reconciliation />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}


export default App;