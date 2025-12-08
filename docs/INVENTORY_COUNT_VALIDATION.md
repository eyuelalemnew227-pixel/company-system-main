# Inventory Count Validation

This document explains the validation system implemented for inventory counting to ensure data accuracy.

## Features Implemented

### 1. Min/Max Threshold Validation (Option 1)

Products can now have configurable count thresholds:

- **Min Count Threshold**: Minimum allowed count value for the product
- **Max Count Threshold**: Maximum allowed count value for the product
- **Variance Percentage**: Allowed percentage deviation from previous approved count (default: 20%)

#### Database Schema
```sql
products table:
- min_count_threshold (decimal 10,2, nullable)
- max_count_threshold (decimal 10,2, nullable)
- variance_percentage (decimal 5,2, nullable, default: 20.00)
```

#### Usage
When creating or editing products, you can set:
- Minimum count threshold (e.g., 0 for products that must have stock)
- Maximum count threshold (e.g., 1000 for warehouse capacity limits)
- Variance percentage (e.g., 20% means counts can vary ±20% from previous approved count)

### 2. Variance-Based Validation (Option 2)

The system automatically validates new counts against previous approved counts:

- Compares current count with the most recent approved count from previous periods
- Calculates percentage change
- Rejects counts that exceed the variance threshold
- Special handling for zero-to-non-zero transitions

#### How It Works

1. **Threshold Validation**: When an inventory counter enters a count:
   - System checks if count < min_count_threshold → **Error**
   - System checks if count > max_count_threshold → **Error**

2. **Variance Validation**: 
   - System retrieves the last approved count for the same product/branch
   - Calculates: `|(current - previous) / previous| * 100`
   - If percentage > variance_percentage → **Error with detailed message**

3. **Error Messages**:
   - "The count must be at least {min} for this product."
   - "The count cannot exceed {max} for this product."
   - "The count shows a {increase/decrease} of X% from the previous approved count (Y), which exceeds the allowed variance of Z%. Please verify the count is correct."

## Implementation Details

### Backend Components

1. **Migration**: `2025_11_27_072049_add_count_thresholds_to_products_table.php`
   - Adds threshold columns to products table

2. **Model**: `app/Models/Product.php`
   - Added fillable fields and casts for threshold columns

3. **Validation Rule**: `app/Rules/ValidateInventoryCount.php`
   - Custom validation rule that checks:
     - Product exists
     - Count is within min/max thresholds
     - Count variance is within allowed percentage

4. **Controller Updates**:
   - `ProductController`: Handles threshold fields in create/update
   - `InventoryCountController`: Applies validation rule to count input

### Frontend Components

1. **Product Forms**: `resources/js/pages/products/Create.tsx` & `Edit.tsx`
   - Added input fields for:
     - Min Count Threshold
     - Max Count Threshold
     - Variance Percentage (with helper text)

## Usage Examples

### Setting Up Product Thresholds

```typescript
// Example product configuration
{
  product_name: "Laptop",
  min_count_threshold: 5,      // Always maintain at least 5 laptops
  max_count_threshold: 100,    // Warehouse can hold max 100 laptops
  variance_percentage: 15      // Allow ±15% change from previous count
}
```

### Validation Scenarios

#### Scenario 1: Below Minimum
- Previous count: 10
- Min threshold: 5
- New count: 3
- Result: **Error** - "The count must be at least 5 for this product."

#### Scenario 2: Above Maximum
- Previous count: 50
- Max threshold: 100
- New count: 120
- Result: **Error** - "The count cannot exceed 100 for this product."

#### Scenario 3: Excessive Variance
- Previous approved count: 100
- New count: 140
- Variance threshold: 20%
- Calculation: |(140-100)/100| * 100 = 40%
- Result: **Error** - "The count shows an increase of 40% from the previous approved count (100), which exceeds the allowed variance of 20%. Please verify the count is correct."

#### Scenario 4: Within Variance
- Previous approved count: 100
- New count: 115
- Variance threshold: 20%
- Calculation: |(115-100)/100| * 100 = 15%
- Result: **Success** - Count is accepted

## Benefits

1. **Data Accuracy**: Prevents obvious data entry errors
2. **Automatic Detection**: Flags unusual inventory changes automatically
3. **Configurable**: Each product can have different thresholds
4. **User-Friendly**: Clear error messages guide users to correct issues
5. **Audit Trail**: Works with existing approval system

## Configuration Recommendations

- **Fast-moving products**: Set higher variance percentage (30-40%)
- **Slow-moving products**: Set lower variance percentage (10-15%)
- **High-value items**: Set strict min/max thresholds
- **Perishables**: Consider lower max thresholds
- **Default variance**: 20% is a good starting point for most products

## Future Enhancements (Optional)

- Category-level default thresholds
- Warning system (soft validation) vs hard errors
- Historical trend analysis
- Seasonal variance adjustments
- Role-based override permissions
