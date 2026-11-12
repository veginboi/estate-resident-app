<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin User
 */
class ProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'residentCode' => $this->resident_code,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone ?? '',
            'about' => $this->about ?? '',
            'avatarUrl' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'coverUrl' => $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null,
        ];
    }
}
