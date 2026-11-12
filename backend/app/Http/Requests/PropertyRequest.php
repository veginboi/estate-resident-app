<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PropertyRequest extends FormRequest
{
    public const TYPES = ['House', 'Car', 'Motorcycle', 'Shop', 'Other'];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(self::TYPES)],
            'name' => ['required', 'string', 'max:255'],
            'number' => [
                'required', 'string', 'max:50',
                // A resident can't register the same house or plate number twice.
                Rule::unique('properties', 'number')
                    ->where('user_id', $this->user()->id)
                    ->ignore($this->route('property')),
            ],
            'colour' => ['nullable', 'string', 'max:50'],
            'details' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'number.unique' => 'You have already registered :input.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'number' => strtoupper(trim((string) $this->input('number'))),
        ]);
    }
}
