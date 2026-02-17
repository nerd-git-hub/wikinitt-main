"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAT_ENDPOINT } from "@/lib/chat";
import { useSession } from "next-auth/react";

interface QueueStatus {
    queue_size: number;
    processed_count: number;
    scheduled_count: number;
    queued_urls: string[];
}

export default function RedisQueueViewer() {
    const queryClient = useQueryClient();
    const [newUrl, setNewUrl] = useState("");
    const { data: session } = useSession()

    const { data, isLoading, isError } = useQuery<QueueStatus>({
        queryKey: ["redis-queue"],
        queryFn: async () => {
            if (!session) throw new Error("No session");
            const res = await fetch(`${CHAT_ENDPOINT}/admin/redis/queue`, {
                headers: {
                    'Authorization': `Bearer ${session.backendToken}`
                }
            });
            if (!res.ok) throw new Error("Failed to fetch queue status");
            return res.json();
        },
        refetchInterval: 2000,
        enabled: !!session?.backendToken
    });

    const flushMutation = useMutation({
        mutationFn: async () => {
            if (!session) throw new Error("No session");
            const res = await fetch(`${CHAT_ENDPOINT}/admin/redis/queue`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${session.backendToken}`
                }
            });
            if (!res.ok) throw new Error("Failed to flush queue");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["redis-queue"] });
            alert("Queue flushed successfully.");
        },
        onError: (err) => {
            alert(`Error flushing queue: ${err}`);
        }
    });

    const addUrlMutation = useMutation({
        mutationFn: async (url: string) => {
            if (!session) throw new Error("No session");
            const res = await fetch(`${CHAT_ENDPOINT}/admin/redis/queue`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${session.backendToken}`
                },
                body: JSON.stringify({ url }),
            });
            if (!res.ok) throw new Error("Failed to add URL");
            return res.json();
        },
        onSuccess: () => {
            setNewUrl("");
            queryClient.invalidateQueries({ queryKey: ["redis-queue"] });
            alert("URL added to queue.");
        },
        onError: (err) => {
            alert(`Error adding URL: ${err}`);
        }
    });

    const handleFlush = () => {
        if (confirm("Are you sure you want to FLUSH the entire Redis queue? This will remove all pending URLs and reset the duplication filter.")) {
            flushMutation.mutate();
        }
    };

    const handleAddStartUrl = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUrl) return;
        addUrlMutation.mutate(newUrl);
    };

    if (isLoading) return <div className="p-4 text-gray-500">Loading live queue stats...</div>;
    if (isError) return <div className="p-4 text-red-500">Error connecting to Redis API</div>;

    return (
        <div className="space-y-6">

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-lg border shadow-sm">
                <form onSubmit={handleAddStartUrl} className="flex gap-2 items-end w-full md:max-w-md">
                    <div className="grid w-full items-center gap-1.5">
                        <label htmlFor="url" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Add Start URL
                        </label>
                        <Input
                            id="url"
                            placeholder="https://www.nitt.edu/page-to-crawl"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={addUrlMutation.isPending}>
                        <Plus className="mr-2 h-4 w-4" />
                        {addUrlMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                </form>

                <div>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleFlush}
                        disabled={flushMutation.isPending}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {flushMutation.isPending ? "Flushing..." : "Flush Queue"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Queue Size Card */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm bg-white p-6">
                    <div className="flex flex-col space-y-1.5 pb-2">
                        <h3 className="text-sm font-medium leading-none tracking-tight text-gray-500">Queue Size</h3>
                    </div>
                    <div className="text-2xl font-bold">{data?.queue_size}</div>
                    <p className="text-xs text-muted-foreground text-gray-400">URLs waiting to be crawled</p>
                </div>

                {/* Scheduled Count Card */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm bg-white p-6">
                    <div className="flex flex-col space-y-1.5 pb-2">
                        <h3 className="text-sm font-medium leading-none tracking-tight text-gray-500">Scheduled</h3>
                    </div>
                    <div className="text-2xl font-bold">{data?.scheduled_count}</div>
                    <p className="text-xs text-muted-foreground text-gray-400">Waitlist (Start URLs)</p>
                </div>

                {/* Processed Count Card */}
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm bg-white p-6">
                    <div className="flex flex-col space-y-1.5 pb-2">
                        <h3 className="text-sm font-medium leading-none tracking-tight text-gray-500">Processed URLs</h3>
                    </div>
                    <div className="text-2xl font-bold">{data?.processed_count}</div>
                    <p className="text-xs text-muted-foreground text-gray-400">Total URLs seen (De-duplication)</p>
                </div>
            </div>

            {/* Live Queue list */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm bg-white">
                <div className="flex flex-col space-y-1.5 p-6 pb-2">
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Live Queue (Next up)</h3>
                </div>
                <div className="p-6 pt-0">
                    {!data?.queued_urls || data.queued_urls.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-4">Queue is empty.</p>
                    ) : (
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs h-96 overflow-y-auto mt-4">
                            {data.queued_urls.map((url, i) => (
                                <div key={i} className="py-1 border-b border-slate-800 last:border-0 truncate flex">
                                    <span className="text-green-400 mr-2 shrink-0">[{i + 1}]</span>
                                    <span className="truncate">{url}</span>
                                </div>
                            ))}
                            {data.queue_size > data.queued_urls.length && (
                                <div className="py-2 text-center text-gray-500 italic border-t border-slate-800 mt-2">
                                    ... and {data.queue_size - data.queued_urls.length} more
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
