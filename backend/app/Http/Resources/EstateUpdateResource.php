<?php

namespace App\Http\Resources;

use App\Models\EstateUpdate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin EstateUpdate
 */
class EstateUpdateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author' => $this->author,
            'body' => $this->body,
            'imageUrl' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'postedAt' => $this->published_at->format('H:i'),
            'publishedAt' => $this->published_at->toIso8601String(),
        ];
    }
}
