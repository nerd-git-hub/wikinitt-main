import FeaturedCarousel from "@/components/FeaturedCarousel";
export const dynamic = "force-dynamic";

import ArticlesView from "@/components/ArticlesView";
import LandingNavbar from "@/components/LandingNavbar";
import { request } from "graphql-request";
import { GET_ARTICLES } from "@/gql/queries";
import { Query } from "@/gql/graphql";

async function getArticles() {
  const endpoint =
    process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
  try {
    const data = await request<Query>(endpoint, GET_ARTICLES, {
      limit: 9,
      offset: 0,
    });
    return data?.articles || [];
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return [];
  }
}

async function getFeaturedArticles() {
  const endpoint =
    process.env.NEXT_PUBLIC_GRAPHQL_API_URL || "http://localhost:8080/query";
  try {
    const data = await request<Query>(endpoint, GET_ARTICLES, {
      featured: true,
    });
    return data?.articles || [];
  } catch (error) {
    console.error("Failed to fetch featured articles:", error);
    return [];
  }
}

export default async function ArticlesPage() {
  const [articles, featuredArticles] = await Promise.all([
    getArticles(),
    getFeaturedArticles(),
  ]);

  return (
    <div className="relative min-h-screen overflow-x-hidden font-[Manrope,sans-serif] bg-[#fdfcff] text-[#1a1a1a]">
      
      {/* Background Ambient Blobs */}
      <div className="absolute w-[60vw] h-[60vh] z-0 pointer-events-none top-[-10%] left-[-10%] bg-[radial-gradient(circle,rgba(169,196,255,0.4)_0%,rgba(255,255,255,0)_70%)]"></div>
      <div className="absolute w-[60vw] h-[60vh] z-0 pointer-events-none top-[10%] right-[-10%] bg-[radial-gradient(circle,rgba(245,200,255,0.4)_0%,rgba(255,255,255,0)_70%)]"></div>

      <LandingNavbar />

      <main className="relative z-10 max-w-[1440px] mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Featured Section */}
        {featuredArticles.length > 0 && (
          <section>
              <FeaturedCarousel articles={featuredArticles} />
          </section>
        )}
        
        {/* Main Grid Section */}
        <section>
            <ArticlesView articles={articles} />
        </section>
      </main>
    </div>
  );
}
