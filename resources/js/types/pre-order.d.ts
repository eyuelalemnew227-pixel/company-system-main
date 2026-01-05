export interface PreOrderProduct {
    id: number;
    product_name: string;
    unit_price: string;
    walkin_price: string;
    status: 'Active' | 'Inactive';
    created_at: string;
    updated_at: string;
}

export interface OrderType {
    id: number;
    name: string;
    status: 'Active' | 'Inactive';
    created_at: string;
    updated_at: string;
}

export interface CollectionDay {
    id: number;
    name: string;
    display_order: number;
    status: 'Active' | 'Inactive';
    holiday_id?: number;
    holiday?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

export interface PreOrderItem {
    id: number;
    pre_order_id: number;
    pre_order_product_id: number;
    quantity: number;
    unit_price: string;
    subtotal: string;
    created_at: string;
    updated_at: string;
    product?: PreOrderProduct;
}

export interface PreOrder {
    id: number;
    order_number: string;
    client_name: string;
    phone_number: string;
    order_type_id: number;
    collection_day_id: number;
    collection_branch_id: number;
    voucher_code?: string;
    transaction_reference?: string;
    registering_branch_id?: number;
    status: 'Pending' | 'Paid' | 'Collected' | 'Cancelled';
    total_amount: string;
    created_by: number;
    updated_by?: number;
    collected_at?: string;
    collected_by?: number;
    created_at: string;
    updated_at: string;
    order_type?: OrderType;
    collection_day?: CollectionDay;
    collection_branch?: {
        id: number;
        name: string;
        location?: string;
    };
    registering_branch?: {
        id: number;
        name: string;
        location?: string;
    };
    creator?: {
        id: number;
        name: string;
    };
    updater?: {
        id: number;
        name: string;
    };
    collector?: {
        id: number;
        name: string;
    };
    items?: PreOrderItem[];
    late_payment?: boolean;
    payment_method?: 'Tele Birr' | 'CBE';
}
