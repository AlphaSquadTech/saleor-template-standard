import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { shopApi, type ProductDetail } from "@/lib/api/shop";
import AddToCartClient from "@/app/components/reuseableUI/AddToCartClient";
import {
  generateProductSchema,
  generateBreadcrumbSchema,
} from "@/lib/schema";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShopProductDetailPage({ params }: PageProps) {
  const raw = (await params)?.id ?? '';
  if (!raw) return notFound();
  let id = raw;
  try {
    // Next.js usually provides decoded params, but guard against encoded inputs
    id = decodeURIComponent(raw);
  } catch {
    id = raw;
  }

  let product: ProductDetail | null = null;
  try {
    product = await shopApi.getProductById(id);
  } catch {
    // If the REST API fails or product not found
    return notFound();
  }

  if (!product) return notFound();

  const currency = product.currency || "USD";
  const price = product.price_min ?? product.price_max ?? 0;
  const images = product.all_images?.length ? product.all_images : (product.thumbnail_url ? [product.thumbnail_url] : []);
  const primaryImage = images[0] || "";

  // Generate schema.org structured data
  const productSchema = generateProductSchema({
    id: String(product.id),
    name: product.name,
    description: product.description || "",
    image: images,
    price: price,
    currency: currency,
    availability: product.availability_status === "in_stock" ? "InStock" : "OutOfStock",
    sku: product.sku?.[0] || String(product.id),
    brand: product.brand,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/products/all" },
    { name: product.name, url: `/products/product/${id}` },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/products/all" className="hover:underline">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image Gallery */}
        <div>
          <div className="relative w-full aspect-square bg-gray-50 rounded-md overflow-hidden">
            {images[0] ? (
              <Image src={images[0]} alt={product.name} fill className="object-contain p-4" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-full aspect-square border rounded overflow-hidden">
                  <Image src={img} alt={`thumb-${idx}`} fill className="object-contain p-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">{product.name}</h1>

          <div className="mb-3 text-sm text-gray-600">
            <span className="mr-3">Brand: <span className="font-medium">{product.brand}</span></span>
            <span>Status: <span className="font-medium capitalize">{product.availability_status?.replace(/_/g, " ")}</span></span>
          </div>

          <div className="mb-5 flex items-center gap-2">
            <span className="text-2xl text-red-600 font-bold">
              {new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price)}
            </span>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700">{product.description}</p>
          </div>

          <div className="space-y-3">
            <AddToCartClient
              id={String(product.id)}
              name={product.name}
              price={price}
              image={primaryImage}
              sku={product.sku?.[0] ?? null}
            />
          </div>
        </div>
      </div>

      {/* Meta */}
      {product.category_hierarchy?.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {product.category_hierarchy.map((c) => (
              <span key={String(c.id)} className="px-2 py-1 rounded border bg-gray-50 text-gray-700">{c.title}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
