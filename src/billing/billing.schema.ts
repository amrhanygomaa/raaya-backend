/**
 * US-15-03: Family Billing schema types
 */

export interface FamilyBill {
  id: string;
  facilityId: string;
  residentId: string;
  title: string;
  month: string;
  amount: number;
  isPaid: boolean;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}
