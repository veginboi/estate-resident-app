<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Database backups
    |--------------------------------------------------------------------------
    |
    | `php artisan db:backup` writes a copy of the database to `path` and
    | deletes copies older than `keep_days`. The scheduler runs it every day
    | at `time` (server time), so the cron entry for `schedule:run` must be
    | set up on the server:
    |   * * * * * cd /path/to/backend && php artisan schedule:run
    |
    | Keep the backup folder on a different disk from the database, or copy
    | it off the server regularly, so one failure can't take out both.
    |
    */

    'path' => env('BACKUP_PATH') ?: storage_path('app/backups'),

    'keep_days' => (int) env('BACKUP_KEEP_DAYS', 14),

    'time' => env('BACKUP_TIME') ?: '02:00',

    // Full path to pg_dump if it isn't on the PATH of the user running the scheduler.
    'pg_dump' => env('BACKUP_PG_DUMP', 'pg_dump'),

];
