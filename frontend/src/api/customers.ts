import apiClient from "./client";

export interface Route {
  id: number;
  code: string;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  customer_count: number;
  created_at: string;
  created_by_name: string | null;
  updated_at: string;
  updated_by_name: string | null;
}

export interface Customer {
  id: number;

  code: string;
  shop_name: string;
  contact_person: string;

  mobile: string;
  alternate_mobile: string;

  address: string;

  route: number;
  route_name: string;

  customer_type:
    | "RETAIL"
    | "VAN"
    | "WHOLESALE"
    | "COUNTER"
    | "OTHER";

  credit_limit: string;
  opening_balance: string;

  notes: string;

  status: "ACTIVE" | "INACTIVE";

  created_at: string;
  created_by_name: string | null;

  updated_at: string;
  updated_by_name: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getCustomers = async (
  search = "",
): Promise<PaginatedResponse<Customer>> => {
  const response = await apiClient.get(
    "/customers/",
    {
      params: {
        search: search || undefined,
      },
    },
  );

  return response.data;
};

export const createCustomer = async (
  data: Omit<
    Customer,
    | "id"
    | "route_name"
    | "created_at"
    | "created_by_name"
    | "updated_at"
    | "updated_by_name"
  >,
): Promise<Customer> => {
  const response = await apiClient.post(
    "/customers/",
    data,
  );

  return response.data;
};

export const updateCustomer = async (
  id: number,
  data: Partial<Customer>,
): Promise<Customer> => {
  const response = await apiClient.patch(
    `/customers/${id}/`,
    data,
  );

  return response.data;
};

export const deleteCustomer = async (
  id: number,
): Promise<void> => {
  await apiClient.delete(
    `/customers/${id}/`,
  );
};

export const getRoutes = async (
  search = "",
): Promise<PaginatedResponse<Route>> => {
  const response = await apiClient.get(
    "/routes/",
    {
      params: {
        search: search || undefined,
      },
    },
  );

  return response.data;
};

export const createRoute = async (
  data: {
    code: string;
    name: string;
    description: string;
    status: "ACTIVE" | "INACTIVE";
  },
): Promise<Route> => {
  const response = await apiClient.post(
    "/routes/",
    data,
  );

  return response.data;
};

export const updateRoute = async (
  id: number,
  data: Partial<Route>,
): Promise<Route> => {
  const response = await apiClient.patch(
    `/routes/${id}/`,
    data,
  );

  return response.data;
};

export const deleteRoute = async (
  id: number,
): Promise<void> => {
  await apiClient.delete(
    `/routes/${id}/`,
  );
};