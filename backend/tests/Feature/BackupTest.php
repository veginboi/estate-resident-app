<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class BackupTest extends TestCase
{
    use DatabaseMigrations; // VACUUM INTO can't run inside the transaction RefreshDatabase uses

    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.connections.'.config('database.default').'.driver') !== 'sqlite') {
            $this->markTestSkipped('The PostgreSQL backup is checked end to end in CI.');
        }

        $this->directory = sys_get_temp_dir().'/le-backup-test-'.uniqid();
        config(['backup.path' => $this->directory, 'backup.keep_days' => 14]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->directory);

        parent::tearDown();
    }

    public function test_backup_writes_a_copy_of_the_database(): void
    {
        User::factory()->create(['email' => 'kept@example.com']);

        $this->artisan('db:backup')->assertSuccessful();

        $files = File::glob($this->directory.'/sqlite-*.sqlite');
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
        $old = $this->directory.'/sqlite-2020-01-01_020000.sqlite';
        $recent = $this->directory.'/sqlite-recent.sqlite';
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
