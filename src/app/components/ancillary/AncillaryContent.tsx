import EditorRenderer from "@/app/components/richText/EditorRenderer"
import { fetchPageBySlug } from "@/graphql/queries/getPageBySlug"

export default async function AncillaryContent({ slug }: { slug: string }) {
  const page = await fetchPageBySlug(slug)
  return <EditorRenderer content={page?.content ?? null} />
}
