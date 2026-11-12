<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Runs against its own SQLite file instead of the shared test database, so it works the
 * same whichever database the suite uses. (VACUUM INTO can't run inside the transaction
 * that RefreshDatabase wraps each test in.) The PostgreSQL dump is checked end to end in CI.
 */
class BackupTest extends TestCase
{
    private string $directory;

    private string $workDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workDir = sys_get_temp_dir().'/le-backup-test-'.uniqid();
        $this->directory = $this->workDir.'/backups';
        File::ensureDirectoryExists($this->workDir);
        File::put($this->workDir.'/app.sqlite', '');

        config([
            'database.connections.backup_test' => [
                'driver' => 'sqlite',
                'database' => $this->workDir.'/app.sqlite',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
            'database.default' => 'backup_test',
            'backup.path' => $this->directory,
            'backup.keep_days' => 14,
        ]);

        $this->artisan('migrate', ['--database' => 'backup_test', '--force' => true])->assertSuccessful();
    }

    protected function tearDown(): void
    {
        DB::disconnect('backup_test');
        File::deleteDirectory($this->workDir);

        parent::tearDown();
    }

    public function test_backup_writes_a_copy_of_the_database(): void
    {
        User::factory()->create(['email' => 'kept@example.com']);

        $this->artisan('db:backup')->assertSuccessful();

        $files = File::glob($this->directory.'/backup_test-*.sqlite');
        $this->assertCount(1, $files);

        $copy = new \PDO('sqlite:'.$files[0]);
        $this->assertSame(
            'kept@example.com',
            $copy->query("select email from users where email = 'kept@example.com'")->fetchColumn(),
        );
    }

    public function test_backup_removes_copies_older_than_the_keep_period(): void
    {
        File::ensureDirectoryExists($this->directory);
        $old = $this->directory.'/backup_test-2020-01-01_020000.sqlite';
        $recent = $this->directory.'/backup_test-recent.sqlite';
        $unrelated = $this->directory.'/notes.txt';
        File::put($old, 'old');
        File::put($recent, 'recent');
        File::put($unrelated, 'keep me');
        touch($old, now()->subDays(20)->getTimestamp());
        touch($recent, now()->subDays(3)->getTimestamp());

        $this->artisan('db:backup')->assertSuccessful();

        $this->assertFileDoesNotExist($old);
        $this->assertFileExists($recent);
        $this->assertFileExists($unrelated);
    }

    public function test_backup_is_scheduled_nightly(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('db:backup')->assertSuccessful();
    }
}
