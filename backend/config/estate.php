<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Estate details
    |--------------------------------------------------------------------------
    */

    'name' => env('ESTATE_NAME', 'LincolnEstate'),

    'emergency_line' => env('ESTATE_EMERGENCY_LINE', '+234 810 000 0000'),

    /*
    |--------------------------------------------------------------------------
    | Bank account for bills
    |--------------------------------------------------------------------------
    |
    | Residents pay bills by bank transfer to this account, then upload the
    | transfer receipt in the app.
    |
    */

    'bank' => [
        'name' => env('ESTATE_BANK_NAME', ''),
        'account_name' => env('ESTATE_BANK_ACCOUNT_NAME', ''),
        'account_number' => env('ESTATE_BANK_ACCOUNT_NUMBER', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | Estate map
    |--------------------------------------------------------------------------
    |
    | The map canvas size and road layout. Coordinates are in map units and
    | match the x/y/w/h values stored on each plot.
    |
    */

    'map' => [
        'width' => 1000,
        'height' => 640,
        'roads' => [
            ['x' => 0, 'y' => 300, 'w' => 1000, 'h' => 40, 'name' => 'Main Avenue'],
            ['x' => 480, 'y' => 0, 'w' => 40, 'h' => 640, 'name' => 'Central Close'],
        ],
    ],

];
