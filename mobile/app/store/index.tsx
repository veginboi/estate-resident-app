import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { naira } from "@/components/payments";
import { CATEGORY_ICONS, Stepper } from "@/components/store";
import { colors, fonts, shadow } from "@/components/theme";
import { Button, Card, Chip, EmptyState, ErrorState, IconButton, LoadingState, Screen, Txt } from "@/components/ui";
import { api, imageSource, isMockMode } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";
import { useData } from "@/lib/use-data";

function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const quantity = cart.quantityOf(product.id);
  const image = imageSource(product.imageUrl);
  return (
    <Card style={{ flexDirection: "row", gap: 12, padding: 12 }}>
      {image ? (
        <Image source={image} style={{ width: 64, height: 64, borderRadius: 6 }} accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: 6, backgroundColor: colors.brandTint, alignItems: "center", justifyContent: "center" }}>
          <Feather name={CATEGORY_ICONS[product.category] ?? "package"} size={26} color={colors.brand} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt weight="semibold">{product.name}</Txt>
        {product.description ? (
          <Txt style={{ fontSize: 13, color: colors.muted }} numberOfLines={2}>
            {product.description}
          </Txt>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 8 }}>
          <Txt style={{ flexShrink: 1 }}>
            <Txt weight="semibold">{naira(product.price)}</Txt>
            {product.unit ? <Txt style={{ fontSize: 12, color: colors.muted }}> · {product.unit}</Txt> : null}
          </Txt>
          {!product.inStock ? (
            <Txt style={{ fontSize: 12, color: colors.muted }}>Out of stock</Txt>
          ) : quantity > 0 ? (
            <Stepper value={quantity} max={product.maxQuantity} onChange={(n) => cart.setQuantity(product, n)} label={product.name} />
          ) : (
            <Button title="Add" icon="plus" onPress={() => cart.setQuantity(product, 1)} />
          )}
        </View>
      </View>
    </Card>
  );
}

export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, error, loading, refreshing, refresh } = useData(() => api.getProducts({ category: category ?? undefined, q: search }), [category, search]);
  // The full list keeps the cart's prices and availability up to date, and gives the category chips.
  const { syncProducts } = cart;
  const categories = useData(() =>
    api.getProducts().then((r) => {
      syncProducts(r.products);
      return r.categories;
    }),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Stack.Screen
        options={{
          title: "Estate Store",
          headerRight: () => <IconButton icon="package" label="My orders" color={colors.brand} onPress={() => router.push("/store/orders")} />,
        }}
      />
      <Screen onRefresh={refresh} refreshing={refreshing} contentStyle={{ paddingBottom: cart.items.length ? 110 : 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 12 }}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search the store"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Search the store"
            style={{ flex: 1, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[null, ...(categories.data ?? [])].map((c) => (
            <Chip key={c ?? "all"} label={c ?? "All"} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : !data?.products.length ? (
          <EmptyState>{search ? "Nothing matches your search." : "The store has nothing for sale right now."}</EmptyState>
        ) : (
          data.products.map((p) => <ProductCard key={p.id} product={p} />)
        )}

        {isMockMode && (
          <Txt style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>Demo mode: orders and receipts aren&apos;t saved.</Txt>
        )}
      </Screen>

      {cart.items.length > 0 && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 16 + insets.bottom }}>
          <Pressable
            onPress={() => router.push("/store/cart")}
            accessibilityRole="button"
            accessibilityLabel={`View cart, ${cart.count} items, ${naira(cart.total)}`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: pressed ? colors.brandDark : colors.brand,
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 14,
              ...shadow,
            })}
          >
            <Feather name="shopping-cart" size={20} color={colors.white} />
            <Txt weight="semibold" style={{ color: colors.white, flex: 1 }}>
              View cart · {cart.count} item{cart.count === 1 ? "" : "s"}
            </Txt>
            <Txt weight="semibold" style={{ color: colors.white }}>
              {naira(cart.total)}
            </Txt>
          </Pressable>
        </View>
      )}
    </View>
  );
}
