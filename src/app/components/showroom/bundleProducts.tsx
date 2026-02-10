import { GET_BUNDLES } from "@/graphql/queries/getBundles"
import createApolloServerClient from "@/graphql/server-client"
import { Product } from "@/graphql/types/product"
import ProductSwiper from "./productSwiper"

type MetadataItem = { key: string; value: string }
type BundleCollection = {
  id: string
  name: string
  slug: string
  metadata?: MetadataItem[]
  products?: { edges: { node: Product }[] }
}

type Props = {
  count?: number
  collection?: string
}

export const BundleProducts = async ({ count = 10, collection }: Props) => {
  let f_products: Product[] = []
  let bundleName: string | undefined
  let bundlePriceText: string | undefined
  let selectedBundle: BundleCollection | null = null

  try {
    const client = createApolloServerClient()
    const channel = process.env.NEXT_PUBLIC_SALEOR_CHANNEL || "default-channel"

    const { data } = await client.query({
      query: GET_BUNDLES,
      variables: {
        channel,
        first: count,
      },
      fetchPolicy: "cache-first",
      errorPolicy: "all",
    })

    const bundles: BundleCollection[] = (data?.collections?.edges ?? []).map(
      (e: { node: BundleCollection }) => e.node
    )

    if (bundles.length) {
      if (collection) {
        const exact = bundles.find(
          (b: BundleCollection) => b.slug === collection
        )
        selectedBundle = exact ?? bundles[0]
        if (!exact) {
          console.warn(
            `[BundleProducts] Bundle slug "${collection}" not found. Falling back to first bundle "${bundles[0].slug}".`
          )
        }
      } else {
        selectedBundle = bundles[0]
      }
    }

    if (selectedBundle) {
      bundleName = selectedBundle.name
      const meta: Record<string, string> = Object.fromEntries(
        (selectedBundle.metadata ?? []).map((m: MetadataItem) => [
          m.key,
          m.value,
        ])
      )
      bundlePriceText = meta.price || undefined

      f_products =
        selectedBundle.products?.edges?.map((e: { node: Product }) => e.node) ??
        []
    }
  } catch (error) {
    console.error(`[BundleProducts] Error fetching bundle products:`, error)
    // f_products remains empty array, will show empty state
  }

  if (!f_products.length) return null

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-8 lg:gap-20">
      {/* Left promotional section */}
      <div
        style={{
          backgroundColor: "var(--color-primary-600)",
        }}
        className="w-full lg:max-w-[536px] px-4 md:px-8 lg:px-20 pt-6 md:pt-12 lg:pt-24 flex flex-col font-secondary justify-between pb-4 md:pb-8 lg:pb-12 min-h-[300px] lg:min-h-auto"
      >
        <div className="flex flex-col">
          <p
       
            className="text-white text-sm md:text-base lg:text-lg -tracking-[0.045px]"
          >
            RECOMMENDED
          </p>
          <p className="text-white font-medium text-2xl md:text-4xl lg:text-6xl -tracking-[0.15px] leading-tight">
            {bundleName || "Bundle"}
          </p>
        </div>
        <div className="flex flex-col gap-4 md:gap-6 lg:gap-10 mt-4 lg:mt-0">
          {bundlePriceText ? (
            <p className="text-white font-light text-3xl md:text-5xl lg:text-7xl -tracking-[0.18px]">
              {bundlePriceText}
            </p>
          ) : null}
        </div>
      </div>

      {/* Right products section */}
      <section className="py-6 md:py-12 lg:py-24 w-full flex-1 overflow-hidden">
        <ProductSwiper
          key={`bundle-swiper-${selectedBundle?.id || "none"}`}
          products={f_products}
        />
      </section>
    </div>
  )
}
