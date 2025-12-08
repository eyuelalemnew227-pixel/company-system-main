<?php

namespace App\Rules;

use App\Models\InventoryCount;
use App\Models\Product;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidateInventoryCount implements ValidationRule
{
    protected $productId;
    protected $branchId;
    protected $inventoryPeriodId;
    protected $currentCountId;
    protected $warnings = [];

    public function __construct($productId, $branchId, $inventoryPeriodId, $currentCountId = null)
    {
        $this->productId = $productId;
        $this->branchId = $branchId;
        $this->inventoryPeriodId = $inventoryPeriodId;
        $this->currentCountId = $currentCountId;
    }

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $product = Product::find($this->productId);

        if (!$product) {
            $fail('The selected product is invalid.');
            return;
        }

        // Min/Max Threshold Validation
        if ($product->min_count_threshold !== null && $value < $product->min_count_threshold) {
            $fail("The count must be at least {$product->min_count_threshold} for this product.");
            return;
        }

        if ($product->max_count_threshold !== null && $value > $product->max_count_threshold) {
            $fail("The count cannot exceed {$product->max_count_threshold} for this product.");
            return;
        }
    }

    public function getWarnings(): array
    {
        return $this->warnings;
    }
}
