import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import FormattedDate from "@/components/FormattedDate";

type Article = {
  title: string;
  category: string;
  createdAt: string;
  author: { name: string; avatar?: string };
  thumbnail?: string;
  content: string;
};

function rewriteInternalLinks(markdown: string) {
  return markdown.replace(
    /(?<!\!)\]\((\/(?!\/)[^)]+)\)/g,
    "](\/articles$1)"
  );
}

async function getArticle(slug: string): Promise<Article | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_GRAPHQL_API_UR}/api/articles/${slug}`,
    {
      cache: "no-store", // SSR, always fresh
    }
  );

  if (!res.ok) return null;

  return res.json();
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);

  if (!article) notFound();

  const content = rewriteInternalLinks(article.content);

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold uppercase bg-indigo-100 text-indigo-600 rounded-full">
        {article.category}
      </span>

      <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
        {article.title}
      </h1>

      <div className="flex items-center space-x-4 mb-8">
        {article.author.avatar ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-full">
            <Image
              src={article.author.avatar}
              alt={article.author.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
            {article.author.name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-lg font-medium">{article.author.name}</p>
          <p className="text-sm text-gray-500">
            <FormattedDate date={article.createdAt} />
          </p>
        </div>
      </div>

      {article.thumbnail && (
        <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-lg mb-12">
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkBreaks]}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
