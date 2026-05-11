/**
 * US-12-07: Inventory schema types
 */

export type InventoryCategory = 'medications' | 'personal' | 'supplies';

export const VALID_CATEGORIES: InventoryCategory[] = [
  'medications',
  'personal',
  'supplies',
];

export interface InventoryItem {
  id: string;
  facilityId: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  minRequired: number;
  unit: string;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}
