<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Something the estate sells to residents: car stickers, access tags, gas refills, and so on.
 */
#[Fillable(['name', 'description', 'category', 'price', 'unit', 'image_path', 'stock', 'max_per_order', 'is_active', 'sort_order'])]
class Product extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock' => 'integer',
            'max_per_order' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    public function inStock(): bool
    {
        return $this->stock === null || $this->stock > 0;
    }

    /**
     * The most a resident can order at once, or null for no limit.
     */
    public function orderLimit(): ?int
    {
        $limits = array_filter([$this->stock, $this->max_per_order], fn ($v) => $v !== null);

        return $limits ? min($limits) : null;
    }
}
