<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->category,
            'price' => (float) $this->price,
            'unit' => $this->unit,
            'imageUrl' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'inStock' => $this->inStock(),
            'maxQuantity' => $this->orderLimit(),
        ];
    }
}
