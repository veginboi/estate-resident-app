<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use RuntimeException;

/**
 * Writes a copy of the database to the backup folder and removes old copies.
 *
 * PostgreSQL is dumped with pg_dump in its custom format (compressed, restored
 * with pg_restore). SQLite, used for local development, is copied with VACUUM INTO.
 */
class BackupDatabase extends Command
{
    protected $signature = 'db:backup
        {--keep= : Days of backups to keep (defaults to BACKUP_KEEP_DAYS)}';

    protected $description = 'Back up the database and delete old backups';

    public function handle(): int
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");
        $directory = config('backup.path');
        File::ensureDirectoryExists($directory, 0700);

        $stamp = now()->format('Y-m-d_His');

        try {
            $file = match ($config['driver']) {
                'pgsql' => $this->dumpPostgres($config, "{$directory}/{$connection}-{$stamp}.dump"),
                'sqlite' => $this->copySqlite($connection, "{$directory}/{$connection}-{$stamp}.sqlite"),
                default => throw new RuntimeException("Backups aren't supported for the {$config['driver']} driver."),
            };
        } catch (RuntimeException $e) {
            $this->error('Backup failed: '.$e->getMessage());

            return self::FAILURE;
        }

        chmod($file, 0600);
        $this->info(sprintf('Backup saved to %s (%s KB)', $file, number_format(filesize($file) / 1024, 1)));

        $removed = $this->prune($directory, $connection, (int) ($this->option('keep') ?? config('backup.keep_days')));
        if ($removed > 0) {
            $this->line("Removed {$removed} old backup(s).");
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function dumpPostgres(array $config, string $file): string
    {
        $target = ! empty($config['url'])
            ? ['--dbname='.$config['url']]
            : [
                '--host='.$config['host'],
                '--port='.$config['port'],
                '--username='.$config['username'],
                '--dbname='.$config['database'],
            ];

        $result = Process::env(['PGPASSWORD' => (string) ($config['password'] ?? '')])
            ->timeout(3600)
            ->run([config('backup.pg_dump'), '--format=custom', '--no-owner', '--no-password', '--file='.$file, ...$target]);

        if ($result->failed()) {
            File::delete($file);
            throw new RuntimeException(trim($result->errorOutput()) ?: 'pg_dump exited with code '.$result->exitCode());
        }

        $this->ensureNotEmpty($file);

        return $file;
    }

    private function copySqlite(string $connection, string $file): string
    {
        DB::connection($connection)->statement('VACUUM INTO ?', [$file]);
        $this->ensureNotEmpty($file);

        return $file;
    }

    private function ensureNotEmpty(string $file): void
    {
        if (! is_file($file) || filesize($file) === 0) {
            File::delete($file);
            throw new RuntimeException('the backup file is empty.');
        }
    }

    private function prune(string $directory, string $connection, int $keepDays): int
    {
        if ($keepDays < 1) {
            return 0;
        }

        $cutoff = Carbon::now()->subDays($keepDays)->getTimestamp();
        $removed = 0;

        foreach (File::glob("{$directory}/{$connection}-*.{dump,sqlite}", GLOB_BRACE) as $old) {
            if (File::lastModified($old) < $cutoff) {
                File::delete($old);
                $removed++;
            }
        }

        return $removed;
    }
}
