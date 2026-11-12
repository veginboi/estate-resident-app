<?php

use Illuminate\Support\Facades\Schedule;

// Nightly database backup. Needs the scheduler cron entry on the server.
Schedule::command('db:backup')
    ->dailyAt(config('backup.time'))
    ->withoutOverlapping()
    ->onFailure(fn () => logger()->critical('Nightly database backup failed. Run `php artisan db:backup` to see why.'));
