export interface Product {
  id: number;

  hsn_code: string;
  name: string;
  grade: string | null;

  cartons_per_unit: number;
  boxes_per_carton: number;
  pieces_per_box: number;

  purchase_rate_per_piece: string;
  box_purchase_rate: string;
  box_retail_rate: string;

  bill_rate: string;
  retail_rate: string;
  new_retail_rate: string;
  mrp: string;

  status: "ACTIVE" | "INACTIVE";

  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  hsn_code: string;
  name: string;
  grade: string;

  cartons_per_unit: number;
  boxes_per_carton: number;
  pieces_per_box: number;

  purchase_rate_per_piece: number;
  box_purchase_rate: number;
  box_retail_rate: number;

  bill_rate: number;
  retail_rate: number;
  new_retail_rate: number;
  mrp: number;

  status: "ACTIVE" | "INACTIVE";
}