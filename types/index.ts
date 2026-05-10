export type AdminRole = 'operations-admin' | 'super-admin';
export type VendorApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface VendorApplicationDocument {
  id: string;
  documentType: string;
  displayName: string;
  documentUrl: string;
  documentStorageKey?: string;
  verificationStatus: VendorApplicationStatus;
  uploadedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'buyer' | 'vendor' | 'vendor-applicant' | 'admin' | 'logistics';
  adminRole?: AdminRole;
  avatar?: string;
  createdAt: Date;
  isVerified: boolean;
}

export interface VendorApplicationSummary {
  id: string;
  applicantUserId: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredHubCode?: string;
  preferredHubName?: string;
  applicationStatus: VendorApplicationStatus;
  rejectionReason?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  applicationData: {
    businessType?: string;
    businessAddress?: string;
    businessLicense?: string;
    taxId?: string;
    preferredHub?: string;
    productCategories?: string[];
    estimatedVolume?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    bvn?: string;
    additionalEvidenceNotes?: string;
  };
  documents: VendorApplicationDocument[];
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Vendor extends User {
  businessName: string;
  businessAddress: string;
  hubLocation: 'idi-oro' | 'ajah' | 'agege' | 'abule-ado';
  vendorId: string;
  businessLicense?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  rating: number;
  totalSales: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  category: ProductCategory;
  description: string;
  images: string[];
  price: number;
  unit: string;
  stock: number;
  minOrder: number;
  maxOrder?: number;
  bulkPricing?: BulkPricing[];
  freshness: 'fresh' | 'very-fresh' | 'premium';
  harvestDate?: Date;
  expiryDate?: Date;
  isOrganic: boolean;
  isAvailable: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type VendorListingPublishStatus =
  | 'draft'
  | 'pending-review'
  | 'published'
  | 'unpublished'
  | 'archived';

export type VendorListingAvailabilityStatus =
  | 'in-stock'
  | 'low-stock'
  | 'out-of-stock'
  | 'unavailable';

export interface VendorListingSummary {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  category: ProductCategory;
  description: string;
  image: string;
  price: number;
  unit: string;
  stock: number;
  minOrder: number;
  maxOrder?: number;
  freshness: 'fresh' | 'very-fresh' | 'premium';
  isOrganic: boolean;
  publishStatus: VendorListingPublishStatus;
  availabilityStatus: VendorListingAvailabilityStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkPricing {
  minQuantity: number;
  price: number;
  discount: number;
}

export type ProductCategory = 
  | 'fruits'
  | 'vegetables'
  | 'grains'
  | 'tubers'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'spices'
  | 'herbs'
  | 'processed';

export interface Order {
  id: string;
  buyerId: string;
  vendorId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: Address;
  deliveryDate?: Date;
  deliveryFee: number;
  notes?: string;
  cancelledAt?: Date;
  statusHistory?: OrderTimelineEvent[];
  deliveryException?: {
    state: 'reported' | 'recovering';
    message: string;
    reportedAt: Date;
  };
  logisticsReadiness?: {
    isAssignable: boolean;
    reason: string;
    blockers: string[];
  };
  logisticsAssignment?: {
    operatorId?: string;
    operatorName?: string;
    deliveryStatus?: 'pending-assignment' | 'assigned' | 'picked-up' | 'out-for-delivery' | 'delivered' | 'failed' | 'cancelled';
    assignedFulfillmentGroups: number;
    dispatchBatchCode?: string;
    proofOfDelivery?: {
      proofType: 'photo' | 'signature' | 'otp' | 'manual-confirmation';
      proofValue?: string;
      proofUrl?: string;
      createdAt: Date;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderSupportTicketSummary {
  id: string;
  ticketNumber: string;
  issueType: string;
  status: 'open' | 'triaged' | 'waiting-on-vendor' | 'waiting-on-logistics' | 'waiting-on-buyer' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentQueue: string;
  latestMessage?: string;
  slaDeadlineAt?: Date;
  slaState: 'none' | 'on-track' | 'breached';
  messages: SupportConversationMessage[];
  attachments: SupportTicketAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportConversationMessage {
  id: string;
  body: string;
  authorRole: 'buyer' | 'support' | 'internal';
  authorLabel: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface SupportTicketAttachment {
  id: string;
  url: string;
  mimeType?: string;
  displayName: string;
  createdAt: Date;
}

export interface AdminSupportTicketSummary {
  id: string;
  ticketNumber: string;
  issueType: string;
  status: 'open' | 'triaged' | 'waiting-on-vendor' | 'waiting-on-logistics' | 'waiting-on-buyer' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentQueue: string;
  liabilityCategory: 'vendor-fault' | 'logistics-fault' | 'platform-fault' | 'shared-fault' | 'pending-review';
  assignedAgent?: {
    id: string;
    name: string;
  };
  requester: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  order?: {
    id: string;
    status: string;
  };
  latestCustomerMessage?: string;
  latestInternalNote?: string;
  latestPublicReply?: string;
  slaDeadlineAt?: Date;
  slaState: 'none' | 'on-track' | 'breached';
  messages: SupportConversationMessage[];
  attachments: SupportTicketAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DispatchBatch {
  id: string;
  batchCode: string;
  orderId: string;
  operatorId?: string;
  operatorName?: string;
  status: 'pending-assignment' | 'assigned' | 'picked-up' | 'out-for-delivery' | 'delivered' | 'failed' | 'cancelled';
  buyerId: string;
  notes?: string;
  destination: {
    area: string;
    lga: string;
    state: string;
  };
  fulfillmentGroupCount: number;
  vendorCount: number;
  vendorNames: string[];
  itemCount: number;
  totalAmount: number;
  proofOfDelivery?: {
      proofType: 'photo' | 'signature' | 'otp' | 'manual-confirmation';
      proofValue?: string;
      proofUrl?: string;
      createdAt: Date;
    };
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderStatus;
  label: string;
  note?: string;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  substitutionStatus?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in-transit'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod = 
  | 'momo'
  | 'bank-transfer'
  | 'card'
  | 'ussd'
  | 'cash-on-delivery';

export interface Address {
  street: string;
  area: string;
  lga: string;
  state: string;
  landmark?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Hub {
  id: string;
  name: string;
  location: string;
  address: string;
  capacity: number;
  activeVendors: number;
  facilities: string[];
  operatingHours: {
    open: string;
    close: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
}
