<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'smsNotifications' => ['required', 'boolean'],
            'emailNotifications' => ['required', 'boolean'],
            'allowChat' => ['required', 'boolean'],
        ];
    }

    /**
     * The validated settings mapped to database columns.
     *
     * @return array<string, bool>
     */
    public function toColumns(): array
    {
        return [
            'sms_notifications' => $this->boolean('smsNotifications'),
            'email_notifications' => $this->boolean('emailNotifications'),
            'allow_chat' => $this->boolean('allowChat'),
        ];
    }
}
