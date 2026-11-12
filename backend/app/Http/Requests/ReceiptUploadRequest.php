<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A bank transfer receipt for a bill or a store order.
 */
class ReceiptUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'amount' => ['required', 'numeric', 'min:1', 'max:100000000'],
            'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'transfer_reference' => ['nullable', 'string', 'max:60'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'receipt.mimes' => 'The receipt must be a photo (JPG or PNG) or a PDF.',
            'receipt.max' => 'The receipt must be smaller than 5 MB.',
            'paid_on.before_or_equal' => "The payment date can't be in the future.",
        ];
    }
}
