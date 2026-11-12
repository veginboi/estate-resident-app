<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_api_root_responds(): void
    {
        $this->getJson('/')->assertOk()->assertJson(['status' => 'ok']);
    }
}
