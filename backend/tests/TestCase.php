<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Authenticate the following requests as a resident using a real API token.
     */
    protected function signIn(?User $user = null): User
    {
        $user ??= User::factory()->create();

        $this->withToken($user->createToken('test')->plainTextToken);
        $this->app['auth']->forgetGuards(); // so a test can switch residents between requests

        return $user;
    }
}
