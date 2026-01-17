import { request } from "graphql-request";
import { GET_POST } from "@/queries/community";
import { Query } from "@/gql/graphql";
import { notFound } from "next/navigation";
import PostView from "@/components/community/PostView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getGraphQLClient } from "@/lib/graphql";
import CommunityLoginPrompt from "@/components/CommunityLoginPrompt";

import { Metadata } from "next";

export const dynamic = "force-dynamic";

async function getPost(id: string, token?: string) {
  try {
    const client = getGraphQLClient(token);
    const data = await client.request<Query>(GET_POST, {
      id,
    });
    return data?.post;
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(postId);

  if (!post) {
    return {
      title: "Post Not Found - Wikinitt",
    };
  }

  return {
    title: `${post.title} - Wikinitt`,
    description: post.content.substring(0, 160),
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const session = await auth();

  if (!session) {
    return <CommunityLoginPrompt />;
  }

  const post = await getPost(postId, session?.backendToken);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to {post.group.name}
          </Link>
        </div>
        <PostView post={post} showCommunityInfo={false} />
      </div>
    </div>
  );
}
