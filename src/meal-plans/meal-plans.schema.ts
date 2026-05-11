/**
 * US-13-07: Meal Plans schema types
 */

export interface MealPlan {
  id: string;
  facilityId: string;
  residentId: string;
  planDate: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  specialInstructions?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
