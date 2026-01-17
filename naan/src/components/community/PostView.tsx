"use client";

import { useMutation } from "@tanstack/react-query";
import { VOTE_POST } from "@/queries/community";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowBigUp, ArrowBigDown, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { getGraphQLClient } from "@/lib/graphql";
import FormattedDate from "@/components/FormattedDate";
import { formatDistanceToNow } from "date-fns";
import { VoteType, Post } from "@/gql/graphql";
import CommentSection from "./CommentSection";
import { useState, useEffect } from "react";

const Markdown = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false },
);

interface PostViewProps {
  post: Post;
  showCommunityInfo?: boolean;
}

export default function PostView({
  post,
  showCommunityInfo = true,
}: PostViewProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [userVote, setUserVote] = useState(post.userVote);
  const [voteCount, setVoteCount] = useState(post.upvotes - post.downvotes);

  useEffect(() => {
    setUserVote(post.userVote);
    setVoteCount(post.upvotes - post.downvotes);
  }, [post.userVote, post.upvotes, post.downvotes]);

  const voteMutation = useMutation({
    mutationFn: async (type: VoteType) => {
      const client = getGraphQLClient(session?.backendToken);
      await client.request(VOTE_POST, {
        postId: post.id,
        type,
      });
    },
    onSuccess: () => {
      router.refresh();
    },
    onError: () => {
      setUserVote(post.userVote);
      setVoteCount(post.upvotes - post.downvotes);
    },
  });

  const handleVote = (type: VoteType) => {
    if (!session) return;

    const currentVote = userVote;
    let newVote = type;
    let newVoteCount = voteCount;

    if (currentVote === type) {
      newVote = VoteType.None;
      if (type === VoteType.Up) newVoteCount--;
      else newVoteCount++;
    } else {
      // Changing vote
      if (currentVote === VoteType.Up) newVoteCount--;
      else if (currentVote === VoteType.Down) newVoteCount++;

      // Apply new vote
      newVote = type;
      if (newVote === VoteType.Up) newVoteCount++;
      else newVoteCount--;
    }

    setUserVote(newVote);
    setVoteCount(newVoteCount);
    voteMutation.mutate(newVote);
  };

  return (
    <div className="space-y-6">
      {}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="shrink-0">
              {post.author.avatar ? (
                <Image
                  className="h-10 w-10 rounded-full object-cover"
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={40}
                  height={40}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  {post.author.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="ml-3">
              <div className="flex items-center text-sm text-gray-500">
                {showCommunityInfo && (
                  <>
                    <span className="font-bold text-gray-900 hover:underline mr-2">
                      {post.group?.slug
                        ? `c/${post.group?.slug}`
                        : post.group?.name}
                    </span>
                    <span className="mr-2">•</span>
                  </>
                )}
                <span className="mr-2">
                  Posted by{" "}
                  <Link
                    href={`/u/${post.author.username}`}
                    className="hover:underline"
                  >
                    u/{post.author.username || post.author.name}
                  </Link>
                </span>
                <span>
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          <div
            className="prose max-w-none text-gray-800"
            data-color-mode="light"
          >
            <Markdown source={post.content} />
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
              <button
                onClick={() => handleVote(VoteType.Up)}
                className={`p-1 rounded hover:bg-gray-200 ${
                  userVote === VoteType.Up ? "text-orange-500" : "text-gray-500"
                }`}
              >
                <ArrowBigUp className="w-6 h-6" />
              </button>
              <span className="font-bold text-gray-700">{voteCount}</span>
              <button
                onClick={() => handleVote(VoteType.Down)}
                className={`p-1 rounded hover:bg-gray-200 ${
                  userVote === VoteType.Down ? "text-blue-500" : "text-gray-500"
                }`}
              >
                <ArrowBigDown className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center text-gray-500">
              <MessageSquare className="w-5 h-5 mr-1" />
              {post.commentsCount} Comments
            </div>
            <button className="flex items-center text-gray-500 hover:text-gray-700">
              <Share2 className="w-5 h-5 mr-1" />
              Share
            </button>
          </div>
        </div>
      </div>

      {}
      <CommentSection comments={post.comments || []} postId={post.id} />
    </div>
  );
}
