<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * The demo estate (and its demo login) is only for local development and
     * testing. It is never seeded on a production server.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('Skipping demo data: APP_ENV is production.');

            return;
        }

        $this->call(DemoEstateSeeder::class);
    }
}
