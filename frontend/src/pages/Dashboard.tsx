import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type Period = "7d" | "30d" | "12m";

type SummaryResponse = {
  sales: {
    total: number;
    count: number;
  };

  purchases: {
    total: number;
    count: number;
  };

  expenses: {
    total: number;
    count: number;
  };

  payments: {
    customer_receipts: number;
    supplier_payments: number;
  };

  masters: {
    active_products: number;
    active_customers: number;
    active_suppliers: number;
    active_locations: number;
  };

  inventory: {
    total_stock: number;
    products_in_stock: number;
  };
};

type TrendItem = {
  date?: string;
  month?: string;
  amount: number;
};

type TrendsResponse = {
  period: Period;
  start_date: string;
  end_date: string;
  sales: TrendItem[];
  purchases: TrendItem[];
  expenses: TrendItem[];
};

type TopProduct = {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  sales_amount: number;
};

type TopProductsResponse = {
  limit: number;
  results: TopProduct[];
};

type RecentTransaction = {
  type: "SALE" | "PURCHASE" | "EXPENSE" | "PAYMENT";
  id: number;
  number: string;
  date: string;
  description: string;
  amount: number;
  status: string;
};

type RecentTransactionsResponse = {
  limit: number;
  results: RecentTransaction[];
};

/* ============================================================
   CUSTOMER OUTSTANDING TYPES
============================================================ */

type Customer = {
  id: number;
  code: string;
  shop_name: string;
  mobile?: string;
  status: string;
};

type CustomerOutstanding = {
  customer: {
    id: number;
    code: string;
    shop_name: string;
    mobile: string;
    status: string;
  };

  summary: {
    total_sales: number;
    total_paid: number;
    invoice_outstanding: number;
    opening_balance: number;
    total_outstanding: number;
  };

  invoices: {
    sale_id: number;
    invoice_number: string;
    sale_date: string;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
    payment_status: string;
  }[];
};

type CustomerListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
};

/* ============================================================
   API
============================================================ */

const DASHBOARD_API = "/api/dashboard";
const CUSTOMERS_API = "/api/customers";

/* ============================================================
   HELPERS
============================================================ */

function toNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatCompactCurrency(value: unknown): string {
  const amount = toNumber(value);

  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return `₹${amount.toFixed(0)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(
    new Date(`${value}T00:00:00`)
  );
}

function getTrendLabel(item: TrendItem): string {
  if (item.date) {
    return formatShortDate(item.date);
  }

  return item.month ?? "";
}

function getTransactionTypeLabel(
  type: RecentTransaction["type"]
): string {
  switch (type) {
    case "SALE":
      return "Sale";

    case "PURCHASE":
      return "Purchase";

    case "EXPENSE":
      return "Expense";

    case "PAYMENT":
      return "Payment";

    default:
      return type;
  }
}

function getTransactionIcon(
  type: RecentTransaction["type"]
) {
  switch (type) {
    case "SALE":
      return ShoppingCart;

    case "PURCHASE":
      return Truck;

    case "EXPENSE":
      return ClipboardList;

    case "PAYMENT":
      return CreditCard;

    default:
      return CircleDollarSign;
  }
}

function getTransactionIconClasses(
  type: RecentTransaction["type"]
): string {
  switch (type) {
    case "SALE":
      return "bg-emerald-50 text-emerald-600";

    case "PURCHASE":
      return "bg-blue-50 text-blue-600";

    case "EXPENSE":
      return "bg-orange-50 text-orange-600";

    case "PAYMENT":
      return "bg-violet-50 text-violet-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getStatusClasses(
  status: string
): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "DRAFT":
      return "bg-amber-50 text-amber-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getPaymentStatusClasses(
  status: string
): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700";

    case "PARTIALLY_PAID":
      return "bg-amber-50 text-amber-700";

    case "UNPAID":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  trend,
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Wallet;
  iconClass: string;
  trend?: "positive" | "negative";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              trend === "positive"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {trend === "positive" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
          </span>
        )}

        <span className="text-xs text-slate-500">
          {subtitle}
        </span>

        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />
      </div>
    </button>
  );
}

/* ============================================================
   MINI BAR
============================================================ */

function MiniBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const width =
    max > 0
      ? Math.max(
          2,
          (value / max) * 100
        )
      : 2;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${className}`}
        style={{
          width: `${Math.min(width, 100)}%`,
        }}
      />
    </div>
  );
}

/* ============================================================
   TREND CHART
============================================================ */

function TrendChart({
  trends,
}: {
  trends: TrendsResponse | null;
}) {
  const chart = useMemo(() => {
    if (!trends) {
      return null;
    }

    const labels = trends.sales.map(
      (item) => getTrendLabel(item)
    );

    const sales = trends.sales.map(
      (item) => toNumber(item.amount)
    );

    const purchases = trends.purchases.map(
      (item) => toNumber(item.amount)
    );

    const expenses = trends.expenses.map(
      (item) => toNumber(item.amount)
    );

    const allValues = [
      ...sales,
      ...purchases,
      ...expenses,
    ];

    const max = Math.max(
      ...allValues,
      1
    );

    return {
      labels,
      sales,
      purchases,
      expenses,
      max,
    };
  }, [trends]);

  if (!chart) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        No trend data available.
      </div>
    );
  }

  const width = 900;
  const height = 280;

  const left = 52;
  const right = 20;
  const top = 20;
  const bottom = 42;

  const chartWidth =
    width - left - right;

  const chartHeight =
    height - top - bottom;

  function pointX(index: number) {
    if (chart!.labels.length <= 1) {
      return left + chartWidth / 2;
    }

    return (
      left +
      (index /
        (chart!.labels.length - 1)) *
        chartWidth
    );
  }

  function pointY(value: number) {
    return (
      top +
      chartHeight -
      (value / chart!.max) *
        chartHeight
    );
  }

  function createPath(
    values: number[]
  ) {
    return values
      .map((value, index) => {
        const x = pointX(index);
        const y = pointY(value);

        return `${
          index === 0 ? "M" : "L"
        } ${x} ${y}`;
      })
      .join(" ");
  }

  const gridValues = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ];

  const labelStep =
    chart.labels.length > 12
      ? Math.ceil(
          chart.labels.length / 6
        )
      : chart.labels.length > 7
        ? 2
        : 1;

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500">
            Sales
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">
            Purchases
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <span className="text-slate-500">
            Expenses
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[300px] min-w-[650px] w-full"
          preserveAspectRatio="none"
        >
          {gridValues.map(
            (ratio) => {
              const y =
                top +
                chartHeight -
                ratio * chartHeight;

              return (
                <g key={ratio}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100"
                  />

                  <text
                    x={left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                  >
                    {formatCompactCurrency(
                      chart.max * ratio
                    )}
                  </text>
                </g>
              );
            }
          )}

          <path
            d={createPath(chart.sales)}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          />

          <path
            d={createPath(chart.purchases)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          />

          <path
            d={createPath(chart.expenses)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-orange-500"
          />

          {chart.sales.map(
            (_, index) => {
              const x =
                pointX(index);

              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={pointY(
                      chart.sales[index]
                    )}
                    r="4"
                    className="fill-white stroke-emerald-500"
                    strokeWidth="2"
                  />

                  {index %
                    labelStep ===
                    0 && (
                    <text
                      x={x}
                      y={
                        height - 14
                      }
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px]"
                    >
                      {
                        chart.labels[
                          index
                        ]
                      }
                    </text>
                  )}
                </g>
              );
            }
          )}
        </svg>
      </div>
    </div>
  );
}

/* ============================================================
   CUSTOMER OUTSTANDING CARD
============================================================ */

function OutstandingCard({
  customer,
  data,
  onCustomerClick,
  onInvoiceClick,
}: {
  customer: Customer;
  data: CustomerOutstanding;
  onCustomerClick: () => void;
  onInvoiceClick: (
    saleId: number
  ) => void;
}) {
  const outstanding =
    toNumber(
      data.summary.total_outstanding
    );

  const invoiceOutstanding =
    toNumber(
      data.summary.invoice_outstanding
    );

  const paid =
    toNumber(
      data.summary.total_paid
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md">
      {/* CUSTOMER HEADER */}

      <button
        type="button"
        onClick={onCustomerClick}
        className="group w-full text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Users className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {customer.shop_name}
                </p>

                <p className="text-xs text-slate-400">
                  {customer.code}
                  {customer.mobile
                    ? ` · ${customer.mobile}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-right">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Outstanding
              </p>

              <p className="mt-1 text-xl font-bold text-red-600">
                {formatCurrency(
                  outstanding
                )}
              </p>
            </div>

            <ChevronRight className="mt-5 h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-red-500" />
          </div>
        </div>
      </button>

      {/* SUMMARY */}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] text-slate-400">
            Sales
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatCurrency(
              data.summary.total_sales
            )}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[11px] text-emerald-600">
            Paid
          </p>

          <p className="mt-1 text-sm font-semibold text-emerald-700">
            {formatCurrency(paid)}
          </p>
        </div>

        <div className="rounded-xl bg-red-50 p-3">
          <p className="text-[11px] text-red-500">
            Due
          </p>

          <p className="mt-1 text-sm font-semibold text-red-700">
            {formatCurrency(
              invoiceOutstanding
            )}
          </p>
        </div>
      </div>

      {/* OPENING BALANCE */}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-400">
          Opening balance
        </span>

        <span className="text-xs font-semibold text-slate-700">
          {formatCurrency(
            data.summary.opening_balance
          )}
        </span>
      </div>

      {/* OUTSTANDING INVOICES */}

      {data.invoices.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">
            Outstanding invoices
          </p>

          <div className="space-y-2">
            {data.invoices
              .filter(
                (invoice) =>
                  toNumber(
                    invoice.outstanding_amount
                  ) > 0
              )
              .slice(0, 3)
              .map((invoice) => (
                <button
                  key={invoice.sale_id}
                  type="button"
                  onClick={() =>
                    onInvoiceClick(
                      invoice.sale_id
                    )
                  }
                  className="group flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {invoice.invoice_number}
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {formatShortDate(
                        invoice.sale_date
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <p className="text-xs font-semibold text-red-600">
                        {formatCurrency(
                          invoice.outstanding_amount
                        )}
                      </p>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${getPaymentStatusClasses(
                          invoice.payment_status
                        )}`}
                      >
                        {
                          invoice.payment_status
                        }
                      </span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN DASHBOARD
============================================================ */

export default function Dashboard() {
  const navigate = useNavigate();

  const [
    summary,
    setSummary,
  ] =
    useState<SummaryResponse | null>(
      null
    );

  const [
    trends,
    setTrends,
  ] =
    useState<TrendsResponse | null>(
      null
    );

  const [
    topProducts,
    setTopProducts,
  ] =
    useState<TopProductsResponse | null>(
      null
    );

  const [
    recentTransactions,
    setRecentTransactions,
  ] =
    useState<RecentTransactionsResponse | null>(
      null
    );

  const [
    customerOutstanding,
    setCustomerOutstanding,
  ] =
    useState<CustomerOutstanding[]>(
      []
    );

  const [
    period,
    setPeriod,
  ] =
    useState<Period>("7d");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  const [
    outstandingLoading,
    setOutstandingLoading,
  ] =
    useState(false);

  /* ============================================================
     LOAD DASHBOARD
  ============================================================ */

  useEffect(() => {
    loadDashboard();
  }, [period]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const [
        summaryResponse,
        trendsResponse,
        topProductsResponse,
        recentTransactionsResponse,
      ] = await Promise.all([
        fetch(
          `${DASHBOARD_API}/summary/`
        ),

        fetch(
          `${DASHBOARD_API}/trends/?period=${period}`
        ),

        fetch(
          `${DASHBOARD_API}/top-products/?limit=5`
        ),

        fetch(
          `${DASHBOARD_API}/recent-transactions/?limit=10`
        ),
      ]);

      if (
        !summaryResponse.ok ||
        !trendsResponse.ok ||
        !topProductsResponse.ok ||
        !recentTransactionsResponse.ok
      ) {
        throw new Error(
          "Unable to load dashboard data."
        );
      }

      const [
        summaryData,
        trendsData,
        topProductsData,
        recentTransactionsData,
      ] = await Promise.all([
        summaryResponse.json(),
        trendsResponse.json(),
        topProductsResponse.json(),
        recentTransactionsResponse.json(),
      ]);

      setSummary(summaryData);
      setTrends(trendsData);

      setTopProducts(
        topProductsData
      );

      setRecentTransactions(
        recentTransactionsData
      );

      /*
       * Customer outstanding is
       * intentionally independent.
       *
       * If it fails, the rest of
       * the dashboard still works.
       */

      loadCustomerOutstanding();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     LOAD CUSTOMER OUTSTANDING
  ============================================================ */

  async function loadCustomerOutstanding() {
    try {
      setOutstandingLoading(true);

      const customersResponse =
        await fetch(
          `${CUSTOMERS_API}/`
        );

      if (
        !customersResponse.ok
      ) {
        return;
      }

      const customersData =
        (await customersResponse.json()) as CustomerListResponse;

      const customers =
        customersData.results.filter(
          (customer) =>
            customer.status ===
            "ACTIVE"
        );

      if (!customers.length) {
        setCustomerOutstanding([]);
        return;
      }

      const results =
        await Promise.all(
          customers.map(
            async (customer) => {
              try {
                const response =
                  await fetch(
                    `${CUSTOMERS_API}/${customer.id}/outstanding/`
                  );

                if (
                  !response.ok
                ) {
                  return null;
                }

                return (await response.json()) as CustomerOutstanding;
              } catch {
                return null;
              }
            }
          )
        );

      const validResults =
        results.filter(
          (
            item
          ): item is CustomerOutstanding =>
            item !== null
        );

      setCustomerOutstanding(
        validResults
          .filter(
            (item) =>
              toNumber(
                item.summary
                  .total_outstanding
              ) > 0
          )
          .sort(
            (a, b) =>
              toNumber(
                b.summary
                  .total_outstanding
              ) -
              toNumber(
                a.summary
                  .total_outstanding
              )
          )
      );
    } catch {
      /*
       * Do not break dashboard
       * if outstanding API fails.
       */
    } finally {
      setOutstandingLoading(false);
    }
  }

  /* ============================================================
     CALCULATIONS
  ============================================================ */

  const netPosition =
    useMemo(() => {
      if (!summary) {
        return 0;
      }

      return (
        toNumber(
          summary.sales.total
        ) -
        toNumber(
          summary.purchases.total
        ) -
        toNumber(
          summary.expenses.total
        )
      );
    }, [summary]);

  const totalActivity =
    useMemo(() => {
      if (!summary) {
        return 0;
      }

      return (
        toNumber(
          summary.sales.total
        ) +
        toNumber(
          summary.purchases.total
        ) +
        toNumber(
          summary.expenses.total
        )
      );
    }, [summary]);

  const topProductMax =
    useMemo(() => {
      if (
        !topProducts?.results.length
      ) {
        return 1;
      }

      return Math.max(
        ...topProducts.results.map(
          (item) =>
            toNumber(
              item.sales_amount
            )
        ),
        1
      );
    }, [topProducts]);

  const totalCustomerOutstanding =
    useMemo(() => {
      return customerOutstanding.reduce(
        (total, item) =>
          total +
          toNumber(
            item.summary
              .total_outstanding
          ),
        0
      );
    }, [customerOutstanding]);

  /* ============================================================
     LOADING
  ============================================================ */

  if (
    loading &&
    !summary
  ) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            1,
            2,
            3,
            4,
          ].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>

        <div className="h-[380px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  /* ============================================================
     ERROR
  ============================================================ */

  if (!summary) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load dashboard.

        {error && (
          <p className="mt-2 text-xs">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  /* ============================================================
     DASHBOARD
  ============================================================ */

  return (
    <div className="space-y-6 pb-8">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Store className="h-3.5 w-3.5" />

            Business Overview
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor your business
            performance and daily
            activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex">
            <CalendarDays className="h-4 w-4" />

            {new Intl.DateTimeFormat(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            ).format(new Date())}
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            {loading
              ? "Refreshing"
              : "Refresh"}
          </button>
        </div>
      </div>

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ========================================================
          KPI CARDS
      ======================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          title="Total Sales"
          value={formatCurrency(
            summary.sales.total
          )}
          subtitle={`${summary.sales.count} completed sales`}
          icon={ShoppingCart}
          iconClass="bg-emerald-50 text-emerald-600"
          trend="positive"
          onClick={() =>
            navigate("/sales")
          }
        />

        <KpiCard
          title="Total Purchases"
          value={formatCurrency(
            summary.purchases.total
          )}
          subtitle={`${summary.purchases.count} completed purchases`}
          icon={Truck}
          iconClass="bg-blue-50 text-blue-600"
          onClick={() =>
            navigate("/purchases")
          }
        />

        <KpiCard
          title="Total Expenses"
          value={formatCurrency(
            summary.expenses.total
          )}
          subtitle={`${summary.expenses.count} completed expenses`}
          icon={Wallet}
          iconClass="bg-orange-50 text-orange-600"
          trend="negative"
          onClick={() =>
            navigate("/expenses")
          }
        />

        <KpiCard
          title="Inventory"
          value={toNumber(
            summary.inventory
              .total_stock
          ).toLocaleString(
            "en-IN"
          )}
          subtitle={`${summary.inventory.products_in_stock} products in stock`}
          icon={Boxes}
          iconClass="bg-violet-50 text-violet-600"
          onClick={() =>
            navigate("/inventory")
          }
        />

      </div>

      {/* ========================================================
          OUTSTANDING ALERT
      ======================================================== */}

      <button
        type="button"
        onClick={() =>
          navigate("/customers")
        }
        className="group w-full rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-5 text-left shadow-sm transition hover:border-red-200 hover:shadow-md"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
              <Banknote className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Customer Outstanding
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Money currently due from customers
              </p>
            </div>

          </div>

          <div className="flex items-center gap-6">

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Customers with balance
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {
                  customerOutstanding.length
                }
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Total Outstanding
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatCurrency(
                  totalCustomerOutstanding
                )}
              </p>
            </div>

            <ChevronRight className="h-5 w-5 text-red-300 transition group-hover:translate-x-1 group-hover:text-red-500" />

          </div>

        </div>
      </button>

      {/* ========================================================
          TREND + FINANCIAL OVERVIEW
      ======================================================== */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">

        {/* TREND */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Financial Trends
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Revenue, purchasing and
                expenses over time
              </p>
            </div>

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">

              {(
                [
                  ["7d", "7D"],
                  ["30d", "30D"],
                  ["12m", "12M"],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPeriod(
                        value
                      )
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      period === value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}

            </div>

          </div>

          <TrendChart
            trends={trends}
          />

          {trends && (
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">

              <span>
                {formatDate(
                  trends.start_date
                )}
              </span>

              <span>
                {formatDate(
                  trends.end_date
                )}
              </span>

            </div>
          )}

        </div>

        {/* FINANCIAL OVERVIEW */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Financial Overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current completed
              transaction position
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/sales")
            }
            className="mt-6 w-full rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
          >

            <p className="text-xs font-medium text-slate-500">
              Net Position
            </p>

            <div className="mt-2 flex items-end justify-between">

              <p
                className={`text-3xl font-bold tracking-tight ${
                  netPosition >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {netPosition >= 0
                  ? "+"
                  : ""}

                {formatCurrency(
                  netPosition
                )}
              </p>

              {netPosition >= 0 ? (
                <ArrowUpRight className="mb-1 h-5 w-5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="mb-1 h-5 w-5 text-red-500" />
              )}

            </div>

            <p className="mt-1 text-xs text-slate-400">
              Sales − Purchases −
              Expenses
            </p>

          </button>

          <div className="mt-6 space-y-5">

            {/* SALES */}

            <button
              type="button"
              onClick={() =>
                navigate("/sales")
              }
              className="group w-full text-left"
            >
              <div className="mb-2 flex items-center justify-between">

                <span className="text-sm text-slate-600">
                  Sales
                </span>

                <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(
                    summary.sales.total
                  )}

                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-1" />
                </span>

              </div>

              <MiniBar
                value={toNumber(
                  summary.sales.total
                )}
                max={totalActivity}
                className="bg-emerald-500"
              />
            </button>

            {/* PURCHASES */}

            <button
              type="button"
              onClick={() =>
                navigate("/purchases")
              }
              className="group w-full text-left"
            >
              <div className="mb-2 flex items-center justify-between">

                <span className="text-sm text-slate-600">
                  Purchases
                </span>

                <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(
                    summary.purchases.total
                  )}

                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-1" />
                </span>

              </div>

              <MiniBar
                value={toNumber(
                  summary.purchases.total
                )}
                max={totalActivity}
                className="bg-blue-500"
              />
            </button>

            {/* EXPENSES */}

            <button
              type="button"
              onClick={() =>
                navigate("/expenses")
              }
              className="group w-full text-left"
            >
              <div className="mb-2 flex items-center justify-between">

                <span className="text-sm text-slate-600">
                  Expenses
                </span>

                <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(
                    summary.expenses.total
                  )}

                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-1" />
                </span>

              </div>

              <MiniBar
                value={toNumber(
                  summary.expenses.total
                )}
                max={totalActivity}
                className="bg-orange-500"
              />
            </button>

          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">

            <button
              type="button"
              onClick={() =>
                navigate("/payments")
              }
              className="group rounded-xl border border-slate-100 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50"
            >

              <p className="text-xs text-slate-400">
                Customer Receipts
              </p>

              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
                {formatCurrency(
                  summary.payments
                    .customer_receipts
                )}

                <ChevronRight className="h-3 w-3 text-slate-300 transition group-hover:translate-x-1" />
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/payments")
              }
              className="group rounded-xl border border-slate-100 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50"
            >

              <p className="text-xs text-slate-400">
                Supplier Payments
              </p>

              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
                {formatCurrency(
                  summary.payments
                    .supplier_payments
                )}

                <ChevronRight className="h-3 w-3 text-slate-300 transition group-hover:translate-x-1" />
              </p>

            </button>

          </div>

        </div>
      </div>

      {/* ========================================================
          CUSTOMER OUTSTANDING
      ======================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <button
            type="button"
            onClick={() =>
              navigate("/customers")
            }
            className="group text-left"
          >

            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              Outstanding Customers

              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Customers who still have
              pending balances
            </p>

          </button>

          <div className="flex items-center gap-2">

            {outstandingLoading && (
              <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            )}

            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              {formatCurrency(
                totalCustomerOutstanding
              )}{" "}
              due
            </span>

          </div>

        </div>

        <div className="p-5">

          {customerOutstanding.length >
          0 ? (
            <div className="grid gap-4 lg:grid-cols-2">

              {customerOutstanding
                .slice(0, 6)
                .map((item) => (
                  <OutstandingCard
                    key={
                      item.customer.id
                    }
                    customer={{
                      id: item.customer.id,
                      code: item.customer.code,
                      shop_name:
                        item.customer.shop_name,
                      mobile:
                        item.customer.mobile,
                      status:
                        item.customer.status,
                    }}
                    data={item}
                    onCustomerClick={() =>
                      navigate(
                        "/customers"
                      )
                    }
                    onInvoiceClick={() =>
                      navigate(
                        "/sales"
                      )
                    }
                  />
                ))}

            </div>
          ) : (
            <div className="py-10 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign className="h-6 w-6" />
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No outstanding balances
              </p>

              <p className="mt-1 text-xs text-slate-400">
                All active customers are
                currently settled.
              </p>

            </div>
          )}

        </div>

      </div>

      {/* ========================================================
          TOP PRODUCTS + RECENT TRANSACTIONS
      ======================================================== */}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">

        {/* TOP PRODUCTS */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <button
            type="button"
            onClick={() =>
              navigate("/products")
            }
            className="group flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left"
          >

            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                Top Products

                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Best-performing products
                by sales
              </p>
            </div>

            <Package className="h-5 w-5 text-slate-300" />

          </button>

          <div className="p-2">

            {topProducts?.results.length ? (
              topProducts.results.map(
                (
                  product,
                  index
                ) => {
                  const amount =
                    toNumber(
                      product.sales_amount
                    );

                  return (
                    <button
                      type="button"
                      key={
                        product.product_id
                      }
                      onClick={() =>
                        navigate(
                          "/products"
                        )
                      }
                      className="group w-full rounded-xl p-3 text-left transition hover:bg-slate-50"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center justify-between gap-3">

                            <p className="truncate text-sm font-semibold text-slate-800">
                              {
                                product.product_name
                              }
                            </p>

                            <p className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-900">
                              {formatCurrency(
                                amount
                              )}

                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-1" />
                            </p>

                          </div>

                          <div className="mt-2 flex items-center gap-3">

                            <div className="flex-1">
                              <MiniBar
                                value={
                                  amount
                                }
                                max={
                                  topProductMax
                                }
                                className="bg-slate-800"
                              />
                            </div>

                            <span className="w-20 text-right text-[11px] text-slate-400">
                              {toNumber(
                                product.quantity_sold
                              ).toLocaleString(
                                "en-IN"
                              )}{" "}
                              units
                            </span>

                          </div>

                        </div>
                      </div>

                    </button>
                  );
                }
              )
            ) : (
              <div className="px-4 py-10 text-center">

                <Package className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm text-slate-500">
                  No completed sales
                  yet.
                </p>

              </div>
            )}

          </div>
        </div>

        {/* RECENT TRANSACTIONS */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <button
            type="button"
            onClick={() =>
              navigate("/payments")
            }
            className="group flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left"
          >

            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                Recent Transactions

                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest business activity
              </p>
            </div>

            <CreditCard className="h-5 w-5 text-slate-300" />

          </button>

          <div className="divide-y divide-slate-100">

            {recentTransactions?.results.length ? (
              recentTransactions.results.map(
                (transaction) => {
                  const Icon =
                    getTransactionIcon(
                      transaction.type
                    );

                  const target =
                    transaction.type ===
                    "SALE"
                      ? "/sales"
                      : transaction.type ===
                          "PURCHASE"
                        ? "/purchases"
                        : transaction.type ===
                            "EXPENSE"
                          ? "/expenses"
                          : "/payments";

                  return (
                    <button
                      type="button"
                      key={`${transaction.type}-${transaction.id}`}
                      onClick={() =>
                        navigate(
                          target
                        )
                      }
                      className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50"
                    >

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getTransactionIconClasses(
                          transaction.type
                        )}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <p className="truncate text-sm font-semibold text-slate-800">
                            {
                              transaction.number
                            }
                          </p>

                          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-slate-500 sm:inline-flex">
                            {getTransactionTypeLabel(
                              transaction.type
                            )}
                          </span>

                        </div>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {
                            transaction.description
                          }{" "}
                          ·{" "}
                          {formatShortDate(
                            transaction.date
                          )}
                        </p>

                      </div>

                      <div className="shrink-0 text-right">

                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(
                            transaction.amount
                          )}
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${getStatusClasses(
                            transaction.status
                          )}`}
                        >
                          {
                            transaction.status
                          }
                        </span>

                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" />

                    </button>
                  );
                }
              )
            ) : (
              <div className="px-5 py-10 text-center">

                <CreditCard className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm text-slate-500">
                  No recent
                  transactions.
                </p>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ========================================================
          BUSINESS MASTERS
      ======================================================== */}

      <div>

        <div className="mb-3">

          <h2 className="text-base font-semibold text-slate-900">
            Business Masters
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Active records across your
            ERP
          </p>

        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* PRODUCTS */}

          <button
            type="button"
            onClick={() =>
              navigate("/products")
            }
            className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Package className="h-4 w-4" />
              </div>

              <div className="flex-1">

                <p className="text-xs text-slate-500">
                  Active Products
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {
                    summary.masters
                      .active_products
                  }
                </p>

              </div>

              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />

            </div>

          </button>

          {/* CUSTOMERS */}

          <button
            type="button"
            onClick={() =>
              navigate("/customers")
            }
            className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>

              <div className="flex-1">

                <p className="text-xs text-slate-500">
                  Active Customers
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {
                    summary.masters
                      .active_customers
                  }
                </p>

              </div>

              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1" />

            </div>

          </button>

          {/* SUPPLIERS */}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Truck className="h-4 w-4" />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  Active Suppliers
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {
                    summary.masters
                      .active_suppliers
                  }
                </p>

              </div>

            </div>

          </div>

          {/* LOCATIONS */}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Store className="h-4 w-4" />
              </div>

              <div>

                <p className="text-xs text-slate-500">
                  Active Locations
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {
                    summary.masters
                      .active_locations
                  }
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          QUICK ACTIONS
      ======================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-base font-semibold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Quickly create a new
              business transaction
            </p>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">

            <button
              type="button"
              onClick={() =>
                navigate("/sales")
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Sale
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/purchases")
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Purchase
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/expenses")
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Expense
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/payments")
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Payment
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}