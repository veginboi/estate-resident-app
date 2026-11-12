<?php

namespace App\Http\Resources;

use App\Models\Plot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Plot
 */
class PlotResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->code,
            'label' => $this->label,
            'kind' => $this->kind,
            'x' => $this->x,
            'y' => $this->y,
            'w' => $this->w,
            'h' => $this->h,
            'owner' => $this->user?->name,
            'isMine' => $this->user_id !== null && (bool) $request->user()?->is($this->user),
            'description' => $this->description,
        ];
    }
}
