import Link from "next/link";

export interface CategoryCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  date?: string;
  metadata?: Array<{
    key?: string | null;
    value?: string | null;
  } | null>;
  pageRoute?: string;
}
export const BlogCard = ({
  id,
  title,
  slug,
  excerpt,
  date,
  metadata,
  pageRoute,
}: CategoryCardProps) => {
  return (
    <Link
      href={`/${pageRoute ? pageRoute : "blog"}/${slug}`}
      key={id}
      className="flex flex-col gap-4 p-6 border border-[var(--color-secondary-200)] rounded-lg hover:border-[var(--color-primary-600)] hover:shadow-lg h-full transition-all duration-200 bg-white"
    >
      <div className="flex flex-col gap-3 w-full">
        {metadata?.filter((item) => item?.key === "topic")[0]?.value && (
          <span className="w-fit text-xs font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-100)] px-2 py-1 rounded-full">
            {metadata?.filter((item) => item?.key === "topic")[0]?.value}
          </span>
        )}
        <h3 className="font-semibold leading-7 -tracking-[0.06px] font-secondary text-xl line-clamp-2 text-[var(--color-secondary-800)]">
          {title}
        </h3>

        {date && (
          <p className="text-xs text-[var(--color-secondary-500)] mt-auto">
            {date}
          </p>
        )}
      </div>

      <div className="text-[var(--color-primary-500)] text-sm font-medium">
        Read more →
      </div>
    </Link>
  );
};
