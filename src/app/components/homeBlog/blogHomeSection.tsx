import { fetchBlogPages } from "@/graphql/queries/getBlogs";
import { BlogClientSection } from "./blogHomeClient";

export default async function BlogSection() {
  const blogs = await fetchBlogPages();

  if (!blogs.length) {
    return null;
  }

  return <BlogClientSection blogs={blogs} />;
}
