"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { JOIN_GROUP, LEAVE_GROUP, DELETE_GROUP } from "@/queries/community";
import { useSession } from "next-auth/react";
import { getGraphQLClient } from "@/lib/graphql";
import { useRouter } from "next/navigation";

interface JoinGroupButtonProps {
  groupId: string;
  initialIsMember: boolean;
  isOwner?: boolean;
  groupType: string;
}

export default function JoinGroupButton({
  groupId,
  initialIsMember,
  isOwner,
  groupType,
}: JoinGroupButtonProps) {
  const [isMember, setIsMember] = useState(initialIsMember);
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      const client = getGraphQLClient(session?.backendToken);
      await client.request(JOIN_GROUP, { groupId });
    },
    onSuccess: () => {
      setIsMember(true);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group"] }); // Invalidate specific group query
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      router.refresh();
    },
    onError: (error: any) => {
      alert("Failed to join group: " + error.message);
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const client = getGraphQLClient(session?.backendToken);
      await client.request(LEAVE_GROUP, { groupId });
    },
    onSuccess: () => {
      setIsMember(false);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group"] });
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      router.refresh();
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      const client = getGraphQLClient(session?.backendToken);
      await client.request(DELETE_GROUP, { groupId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/c");
      router.refresh();
    },
  });

  const isLoading =
    joinGroupMutation.isPending ||
    leaveGroupMutation.isPending ||
    deleteGroupMutation.isPending;

  const handleToggle = () => {
    if (!session) {
      alert("Please login to join groups");
      return;
    }

    if (isOwner) {
      if (
        confirm(
          "Are you sure you want to DELETE this group? This action cannot be undone and will remove all posts and discussions.",
        )
      ) {
        deleteGroupMutation.mutate();
      }
      return;
    }

    if (isMember) {
      if (confirm("Are you sure you want to leave this community?")) {
        leaveGroupMutation.mutate();
      }
    } else {
      if (groupType === "PRIVATE") {
        alert("This is a private group. You need an invite link to join.");
        return;
      }
      joinGroupMutation.mutate();
    }
  };

  if (!isMember && !isOwner && groupType === "PRIVATE") {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-500 bg-gray-100 cursor-not-allowed"
      >
        Private Group
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
        isOwner
          ? "border-red-300 text-red-700 bg-white hover:bg-red-50"
          : isMember
            ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            : "border-transparent text-white bg-indigo-600 hover:bg-indigo-700"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isLoading
        ? "Processing..."
        : isOwner
          ? "Delete Group"
          : isMember
            ? "Leave Group"
            : "Join Group"}
    </button>
  );
}
