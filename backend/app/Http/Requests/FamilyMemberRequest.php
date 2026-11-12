<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FamilyMemberRequest extends FormRequest
{
    public const ROLES = ['Husband', 'Wife', 'Child', 'Parent', 'Sibling', 'Relative', 'Domestic Staff'];

    public const GENDERS = ['Male', 'Female'];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::in(self::ROLES)],
            'age' => ['required', 'integer', 'between:0,120'],
            'gender' => ['required', Rule::in(self::GENDERS)],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['name' => trim((string) $this->input('name'))]);
    }
}
