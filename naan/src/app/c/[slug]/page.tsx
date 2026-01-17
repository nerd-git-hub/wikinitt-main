import { request } from "graphql-request";
import {
  GET_GROUP_BY_SLUG,
  JOIN_GROUP,
  LEAVE_GROUP,
} from "@/queries/community";
import { Query } from "@/gql/graphql";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, Calendar, MessageSquare, Heart } from "lucide-react";

import { auth } from "@/auth";
import { getGraphQLClient } from "@/lib/graphql";
import CommunityLoginPrompt from "@/components/CommunityLoginPrompt";
import JoinGroupButton from "@/components/community/JoinGroupButton";
import PostCard from "@/components/community/PostCard";

import { Metadata } from "next";

async function getGroup(slug: string, token?: string) {
  try {
    const client = getGraphQLClient(token);
    const data = await client.request<Query>(GET_GROUP_BY_SLUG, {
      slug,
      postLimit: 20,
      postOffset: 0,
    });
    return data?.group;
  } catch (error) {
    console.error("Failed to fetch group:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroup(slug);

  if (!group) {
    return {
      title: "Group Not Found - Wikinitt",
    };
  }

  return {
    title: `${group.name} - Wikinitt`,
    description: group.description,
  };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session) {
    return <CommunityLoginPrompt />;
  }

  const group = await getGroup(slug, session?.backendToken);

  if (!group) {
    notFound();
  }

  const isOwner = group.owner.id === session?.user?.id;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="h-32 bg-indigo-600"></div>
          <div className="px-4 py-5 sm:px-6 relative">
            <div className="-mt-16 sm:-mt-20 mb-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-3xl font-bold">
                  {group.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
            <div className="sm:flex sm:justify-between sm:items-end">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {group.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {group.description}
                </p>
                <div className="flex items-center mt-2 text-sm text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {group.membersCount} members
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created{" "}
                    {new Date(group.createdAt).toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <JoinGroupButton
                  groupId={group.id}
                  initialIsMember={group.isMember}
                  isOwner={isOwner}
                />
                {group.isMember ? (
                  <Link
                    href={`/c/${group.slug}/create`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Post
                  </Link>
                ) : (
                  <div className="group relative inline-flex items-center">
                    <span className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed">
                      Create Post
                    </span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Join group to post
                    </div>
                  </div>
                )}
                {group.isMember && (
                  <Link
                    href={`/c/${group.slug}/discussion`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Discussion
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <div className="lg:col-span-2 space-y-6">
            {group.posts.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                No posts yet. Be the first to post!
              </div>
            ) : (
              group.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post as any}
                  groupSlug={group.slug}
                  showCommunityInfo={false}
                />
              ))
            )}
          </div>

          {}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
              <p className="text-gray-600 text-sm mb-4">{group.description}</p>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">
                    {new Date(group.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-900 capitalize">
                    {group.type.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
