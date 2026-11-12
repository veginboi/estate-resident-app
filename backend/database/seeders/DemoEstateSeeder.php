<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\EstateUpdate;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\Plot;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Demo data matching the resident app designs.
 *
 * Demo login: broklyn@gmail.com / password
 */
class DemoEstateSeeder extends Seeder
{
    public function run(): void
    {
        $disk = Storage::disk('public');
        foreach (['house.jpg', 'news.jpg'] as $image) {
            $disk->put("seed/{$image}", file_get_contents(__DIR__."/images/{$image}"));
        }

        $david = User::factory()->create([
            'resident_code' => 'LEHN123B',
            'name' => 'David Onyemenam',
            'email' => 'broklyn@gmail.com',
            'phone' => '+234 810 000 0000',
            'about' => 'Resident of LincolnEstate since 2021. I live in Block B with my wife and son, and I\'m happy to help neighbours with anything around the estate.',
            'cover_path' => 'seed/house.jpg',
            'sms_notifications' => true,
            'email_notifications' => false,
            'allow_chat' => true,
        ]);

        $members = collect([
            ['name' => 'David Onyemenam', 'role' => 'Husband', 'age' => 36, 'gender' => 'Male'],
            ['name' => 'Grace Onyemenam', 'role' => 'Wife', 'age' => 34, 'gender' => 'Female'],
            ['name' => 'Daniel Onyemenam', 'role' => 'Child', 'age' => 8, 'gender' => 'Male'],
        ])->mapWithKeys(fn (array $member) => [$member['name'] => $david->familyMembers()->create($member)]);

        $david->properties()->createMany([
            ['type' => 'House', 'name' => 'LE B001-SECTION', 'number' => 'LHEB001', 'colour' => 'Green', 'details' => '8 Bed Room'],
            ['type' => 'Car', 'name' => 'Lexus', 'number' => 'FCT0023JB', 'colour' => 'Red', 'details' => 'RX350'],
        ]);

        $today = today();
        $yesterday = today()->subDay();
        foreach ([
            ['David Onyemenam', $today, '08:30', 'Family', '18:45', 'Alone'],
            ['Grace Onyemenam', $today, '08:30', 'Family', '18:45', 'Wife'],
            ['Daniel Onyemenam', $today, '07:15', 'Driver', '14:20', 'Driver'],
            ['David Onyemenam', $yesterday, '09:05', 'Alone', '20:10', 'Alone'],
            ['Grace Onyemenam', $yesterday, '11:30', 'Daniel', null, null],
        ] as [$name, $date, $outAt, $outWith, $inAt, $inWith]) {
            $david->activities()->create([
                'family_member_id' => $members[$name]->id,
                'name' => $name,
                'date' => $date->toDateString(),
                'out_at' => $outAt,
                'out_with' => $outWith,
                'in_at' => $inAt,
                'in_with' => $inWith,
            ]);
        }

        foreach ([
            ['Estate service charge for November is due on the 15th.', false],
            ['Residents\' general meeting at the clubhouse this Saturday.', false],
            ['Water supply maintenance on Main Avenue, 10am to 2pm.', true],
            ['Renew your car sticker at the security post.', false],
        ] as [$text, $done]) {
            $david->reminders()->create([
                'text' => $text,
                'remind_at' => $today->copy()->setTime(9, 30),
                'done_at' => $done ? now() : null,
            ]);
        }

        $this->seedFinance($david);
        $this->seedStore($david);

        EstateUpdate::create([
            'author' => 'Estate Admin',
            'body' => 'Police patrols are increasing around the estate this week after reports from neighbouring streets. Please make sure every visitor is registered at the gate.',
            'image_path' => 'seed/news.jpg',
            'published_at' => $today->copy()->setTime(12, 30),
        ]);

        $neighbours = $this->seedMap($david);
        $this->seedChats($david, $neighbours);
    }

    private function seedStore(User $david): void
    {
        $products = collect([
            ['Car sticker (2026)', 'Windscreen sticker that lets your car through the main gate. One per vehicle.', 'Access & Security', 5000, 'per car', null, 3],
            ['Gate access tag', 'Contactless tag for the pedestrian gate. Replacement for lost tags.', 'Access & Security', 7500, 'per tag', null, 4],
            ['Visitor pass booklet', '25 pre-signed visitor passes for regular guests and deliveries.', 'Access & Security', 2000, '25 passes', null, null],
            ['Cooking gas refill', 'Refill delivered and connected by the estate gas vendor.', 'Home', 18000, '12.5 kg', null, 2],
            ['Table water', 'Sachet water from the estate supplier.', 'Home', 600, 'per bag', 120, 20],
            ['Waste bin (120 L)', 'Wheeled bin approved for estate waste collection.', 'Home', 25000, null, 4, 2],
            ['Estate polo shirt', 'Green LincolnEstate polo for residents\' events. Sizes S to XXL.', 'Merchandise', 8000, null, 0, null],
        ])->mapWithKeys(function (array $p, int $i) {
            [$name, $description, $category, $price, $unit, $stock, $max] = $p;

            return [$name => Product::create([
                'name' => $name,
                'description' => $description,
                'category' => $category,
                'price' => $price,
                'unit' => $unit,
                'stock' => $stock,
                'max_per_order' => $max,
                'sort_order' => $i,
            ])];
        });

        $order = function (array $lines, array $attributes) use ($david, $products): Order {
            $items = collect($lines)->map(fn (int $qty, string $name) => [
                'product_id' => $products[$name]->id,
                'name' => $name,
                'unit' => $products[$name]->unit,
                'unit_price' => $products[$name]->price,
                'quantity' => $qty,
                'line_total' => $products[$name]->price * $qty,
            ])->values();
            $order = $david->orders()->create([...$attributes, 'total' => $items->sum('line_total')]);
            $order->items()->createMany($items->all());

            return $order;
        };

        $done = $order(['Car sticker (2026)' => 2], ['delivery_method' => Order::PICKUP, 'fulfilment' => Order::COMPLETED, 'paid_at' => now()->subDays(20)]);
        $done->forceFill(['created_at' => now()->subDays(21)])->save();
        $david->payments()->create([
            'order_id' => $done->id,
            'description' => "Store order {$done->orderNumber()}",
            'amount' => $done->total,
            'method' => 'bank_transfer',
            'paid_at' => $done->paid_at,
        ]);

        $order(['Cooking gas refill' => 1, 'Table water' => 4], [
            'delivery_method' => Order::DELIVERY,
            'note' => 'Please deliver after 4pm.',
            'fulfilment' => Order::OPEN,
        ]);
    }

    private function seedFinance(User $david): void
    {
        $month = today()->startOfMonth();

        // Paid bills, each with the payment the estate recorded for it.
        foreach ([
            ['Service charge (October)', $month->copy()->subMonth()->addDays(14), now()->subMonth()],
            ['Service charge (November)', $month->copy()->addDays(14), now()->subDays(3)],
        ] as [$title, $due, $paidAt]) {
            $bill = $david->bills()->create(['title' => $title, 'amount' => 10000, 'due_date' => $due, 'paid_at' => $paidAt]);
            $david->payments()->create([
                'bill_id' => $bill->id,
                'description' => $title,
                'amount' => 10000,
                'method' => 'bank_transfer',
                'paid_at' => $paidAt,
            ]);
        }

        $david->bills()->create([
            'title' => 'Security levy (Q4)',
            'description' => 'Quarterly contribution to the estate security team and CCTV maintenance.',
            'amount' => 15000,
            'due_date' => $month->copy()->subDays(1),
        ]);

        $david->bills()->create([
            'title' => 'Road repairs levy',
            'description' => 'One-off levy for resurfacing Central Close, agreed at the October residents\' meeting.',
            'amount' => 25000,
            'due_date' => $month->copy()->addMonth()->addDays(4),
        ]);

        // A bill with a transfer receipt waiting for the estate to confirm it.
        $waste = $david->bills()->create([
            'title' => 'Waste collection (November)',
            'amount' => 3500,
            'due_date' => $month->copy()->addDays(19),
        ]);
        $path = "payment-proofs/{$david->id}/demo-transfer-receipt.jpg";
        Storage::disk('local')->put($path, file_get_contents(__DIR__.'/images/news.jpg'));
        $waste->proofs()->create([
            'user_id' => $david->id,
            'amount' => 3500,
            'paid_on' => today()->subDay(),
            'transfer_reference' => 'TRF20261111093',
            'file_path' => $path,
            'file_name' => 'transfer-receipt.jpg',
            'file_mime' => 'image/jpeg',
            'file_size' => Storage::disk('local')->size($path),
            'status' => PaymentProof::PENDING,
        ]);
    }

    /**
     * @param  array<string, User>  $neighbours
     */
    private function seedChats(User $david, array $neighbours): void
    {
        $room = Conversation::estateRoom();
        $start = now()->subHours(5);

        foreach ([
            [$neighbours['A2'], 'Good morning everyone. Has anyone else lost water pressure on Main Avenue?', 0],
            [$neighbours['C2'], 'Yes, since about 7am. The estate office says maintenance ends at 2pm.', 6],
            [$david, 'Thanks Bola. Our tank is full if anyone on Block B needs a few buckets.', 15],
            [$neighbours['B3'], 'Reminder: residents\' meeting at the clubhouse on Saturday, 4pm.', 140],
            [$neighbours['A7'], 'Please slow down on Central Close, children play there in the evenings.', 250],
        ] as [$sender, $body, $minutes]) {
            $room->messages()->create(['user_id' => $sender->id, 'body' => $body])
                ->forceFill(['created_at' => $start->copy()->addMinutes($minutes), 'updated_at' => $start->copy()->addMinutes($minutes)])
                ->save();
        }
        // David has read everything up to his own message.
        $room->addParticipant($david->id, $room->messages()->where('user_id', $david->id)->max('id'));

        $chat = Conversation::between($david, $neighbours['A7']);
        foreach ([
            [$neighbours['A7'], 'Hi David, is the red Lexus FCT0023JB yours? It\'s blocking my gate a little.', 60],
            [$david, 'Sorry Victor, moving it now.', 64],
            [$neighbours['A7'], 'No problem, thank you!', 66],
        ] as [$sender, $body, $minutes]) {
            $chat->messages()->create(['user_id' => $sender->id, 'body' => $body])
                ->forceFill(['created_at' => $start->copy()->addMinutes($minutes), 'updated_at' => $start->copy()->addMinutes($minutes)])
                ->save();
        }
    }

    /**
     * @return array<string, User>
     */
    private function seedMap(User $david): array
    {
        $neighbours = [
            'A2' => User::factory()->create(['name' => 'Mr. Esele Andrew', 'resident_code' => 'EHN102']),
            'A7' => User::factory()->create(['name' => 'Mr. Victor Aguh', 'resident_code' => 'EHN107']),
            'B3' => User::factory()->create(['name' => 'Mr. Iroha .C', 'resident_code' => 'EHN203']),
            'C2' => User::factory()->create(['name' => 'Mrs. Bola Ade', 'resident_code' => 'EHN302']),
        ];

        $rows = [
            ['A', 1, [30, 140, 250, 360], 30, 115],
            ['A', 5, [30, 140, 250, 360], 165, 115],
            ['B', 1, [530, 640, 750, 860], 30, 115],
            ['B', 5, [530, 640, 750, 860], 165, 115],
            ['C', 1, [530, 640, 750, 860], 360, 120],
            ['C', 5, [530, 640, 750, 860], 500, 120],
        ];

        foreach ($rows as [$block, $start, $xs, $y, $h]) {
            foreach ($xs as $i => $x) {
                $code = $block.($start + $i);
                Plot::create([
                    'code' => $code,
                    'label' => $code,
                    'kind' => 'residential',
                    'x' => $x,
                    'y' => $y,
                    'w' => 100,
                    'h' => $h,
                    'user_id' => $code === 'B1' ? $david->id : ($neighbours[$code]->id ?? null),
                    'description' => $code === 'B1' ? 'LE B001-SECTION · 8 Bed Room' : null,
                ]);
            }
        }

        foreach ([
            ['SEC', 'Security Post', 'security', 30, 360, 100, 80, 'Main gate and visitor registration. Open 24 hours.'],
            ['PARK', 'Park', 'green', 140, 360, 320, 80, 'Children\'s playground and walking track.'],
            ['CLUB', 'Clubhouse', 'amenity', 30, 460, 210, 160, 'Hall for meetings and events, plus the gym and pool.'],
            ['ADMIN', 'Estate Office', 'amenity', 250, 460, 210, 160, 'Estate management, payments and complaints. Mon–Sat, 8am–5pm.'],
        ] as [$code, $label, $kind, $x, $y, $w, $h, $description]) {
            Plot::create(compact('code', 'label', 'kind', 'x', 'y', 'w', 'h', 'description'));
        }

        return $neighbours;
    }
}
