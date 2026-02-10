import Image from "next/image";

export interface TestimonialCardProps {
  id: string;
  title: string;
  content: string;
  author?: string;
  rating?: number;
  image?: string;
}

export const TestimonialCard = ({
  id,
  title,
  content,
  author,
  rating,
  image,
}: TestimonialCardProps) => {
  return (
    <div
      key={id}
      style={{ borderColor: "var(--color-secondary-220)" }}
      className="bg-[var(--color-secondary-930)] p-8 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-300 h-full flex flex-col"
    >
      {/* Rating stars if provided */}
      {rating && (
        <div className="flex mb-4">
          {[...Array(5)].map((_, index) => (
            <svg
              key={index}
              style={{
                color: index < rating 
                  ? "var(--color-primary-500)" 
                  : "var(--color-secondary-300)"
              }}
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {/* Title */}
      <h3
        style={{ color: "var(--color-secondary-800)" }}
        className="font-secondary text-xl font-semibold mb-4 leading-7 -tracking-[0.06px]"
      >
        {title}
      </h3>

      {/* Content */}
      <div className="flex-grow">
        <p className="text-[var(--color-secondary-600)] leading-7 text-base tracking-[-0.04px] mb-6 line-clamp-4">
          {content}
        </p>
      </div>

      {/* Author info */}
      {author && (
        <div className="flex items-center gap-3 mt-auto">
          {image && (
            <Image
              src={image}
              alt={author}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          )}
          <div>
            <p
              style={{ color: "var(--color-secondary-600)" }}
              className="font-secondary font-semibold text-sm"
            >
              {author}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};