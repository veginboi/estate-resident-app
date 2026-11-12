<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class SettingsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'smsNotifications' => $this->sms_notifications,
            'emailNotifications' => $this->email_notifications,
            'allowChat' => $this->allow_chat,
        ];
    }
}
