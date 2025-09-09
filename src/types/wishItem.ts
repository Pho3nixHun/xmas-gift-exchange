export interface WishItem {
  id: string;
  description: string;
  url?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
}

export interface URLMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  price?: string;
  currency?: string;
  availability?: string;
  type?: string; // product, article, website, etc.
}

export interface WishItemWithMetadata extends WishItem {
  metadata?: URLMetadata;
  metadataLoading?: boolean;
  metadataError?: string;
  purchasedBy?: string; // Username of person who marked this as bought
  purchaseDate?: number; // Timestamp when marked as purchased
}

export type WishList = WishItemWithMetadata[];

// Update the main types to support the new structure
export interface NamePickerDataV2 {
  names: Record<string, string[]>;
  taken: Record<string, string>;
  gifts: Record<string, string>; // Keep for backward compatibility
  wishLists?: Record<string, WishList>; // New structured wishlist
  passwords?: Record<string, string>;
}
