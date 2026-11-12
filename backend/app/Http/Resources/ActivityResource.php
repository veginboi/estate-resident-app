<?php

namespace App\Http\Resources;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Activity
 */
class ActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'date' => $this->date->toDateString(),
            'outAt' => self::time($this->out_at),
            'outWith' => $this->out_with,
            'inAt' => self::time($this->in_at),
            'inWith' => $this->in_with,
        ];
    }

    /** Turns a database time ("18:45:00") into "18:45". */
    private static function time(?string $value): ?string
    {
        return $value === null ? null : substr($value, 0, 5);
    }
}
