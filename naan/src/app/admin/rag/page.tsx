"use client"
import React, { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import AddDocumentForm from './components/AddDocumentForm';
import EditDocumentModal from './components/EditDocumentModal';
import RedisQueueViewer from './components/RedisQueueViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHAT_ENDPOINT } from '@/lib/chat';

interface AdminDocument {
    id: string;
    source_url: string;
    title: string;
    type: string;
    content: string;
}

export default function RagAdminPage() {
    const { data: session, status } = useSession();
    const [documents, setDocuments] = useState<AdminDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [crawlStatus, setCrawlStatus] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 20;

    // Edit State
    const [editingDoc, setEditingDoc] = useState<AdminDocument | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Search State
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');


    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchDocuments = async (pageNum = 1) => {
        if (status !== 'authenticated' || !session?.backendToken) return;

        setLoading(true);
        try {
            const query = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
            const res = await fetch(`${CHAT_ENDPOINT}/admin/documents?page=${pageNum}&limit=${LIMIT}${query}`, {
                headers: {
                    'Authorization': `Bearer ${session.backendToken}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch documents');
            const data = await res.json();
            setDocuments(data.items);
            setTotalPages(data.pages);
            setPage(data.page);
            // Clear selection when changing pages or fetching new data if desired, 
            // or keep it. For now, let's keep it but formatted to valid IDs.
        } catch (err) {
            console.error(err);
            alert('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchDocuments(page);
        }
    }, [page, debouncedSearch, status]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        if (!session?.backendToken) return;

        try {
            const res = await fetch(`${CHAT_ENDPOINT}/admin/documents/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.backendToken}`
                }
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchDocuments(page);

            // Remove from selection if present
            const newSelected = new Set(selectedIds);
            if (newSelected.has(id)) {
                newSelected.delete(id);
                setSelectedIds(newSelected);
            }
        } catch (err) {
            alert('Error deleting document: ' + err);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} documents?`)) return;
        if (!session?.backendToken) return;

        try {
            const res = await fetch(`${CHAT_ENDPOINT}/admin/documents/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.backendToken}`
                },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });

            if (!res.ok) throw new Error('Failed to bulk delete');

            // Clear selection
            setSelectedIds(new Set());
            fetchDocuments(page);
            alert('Documents deleted successfully');
        } catch (err) {
            console.error(err);
            alert('Error deleting documents: ' + err);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('CRITICAL WARNING: This will delete ALL documents from the database. This action cannot be undone.\n\nAre you absolutely sure?')) return;
        if (!confirm('Please confirm one more time: Do you want to wipe the ENTIRE knowledge base?')) return;

        if (!session?.backendToken) return;

        try {
            const res = await fetch(`${CHAT_ENDPOINT}/admin/documents/all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.backendToken}`
                }
            });

            if (!res.ok) throw new Error('Failed to delete all documents');

            const data = await res.json();

            // Clear selection
            setSelectedIds(new Set());
            fetchDocuments(1);
            alert(data.message);
        } catch (err) {
            console.error(err);
            alert('Error deleting all documents: ' + err);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === documents.length && documents.length > 0) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(documents.map(d => d.id));
            setSelectedIds(allIds);
        }
    };

    const toggleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleEdit = (doc: AdminDocument) => {
        setEditingDoc(doc);
        setIsEditOpen(true);
    };

    const handleCrawl = async () => {
        if (!confirm('Start a new crawl? This might take a while.')) return;
        if (!session?.backendToken) return;

        setCrawlStatus('Crawling started...');
        try {
            const res = await fetch(`${CHAT_ENDPOINT}/admin/crawl`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.backendToken}`
                },
                body: JSON.stringify({ pages: 20 })
            });
            if (!res.ok) throw new Error('Failed to trigger crawl');
            const data = await res.json();
            setCrawlStatus(`Success: ${data.message}`);
        } catch (err) {
            setCrawlStatus('Error triggering crawl');
            console.error(err);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">RAG Index Manager</h1>
                    <p className="text-gray-500">Manage knowledge base for WikiNITT</p>
                </div>
                <div className="flex gap-4 items-center">
                    {crawlStatus && <span className="text-sm text-blue-600">{crawlStatus}</span>}
                    <Button onClick={handleCrawl} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                        Trigger Crawl
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="documents" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="queue">Live Queue</TabsTrigger>
                </TabsList>

                <TabsContent value="documents">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-4 items-center w-full">
                            <div className="relative w-72">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search documents..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            {selectedIds.size > 0 && (
                                <Button
                                    onClick={handleBulkDelete}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Delete Selected ({selectedIds.size})
                                </Button>
                            )}
                            <Button
                                onClick={handleDeleteAll}
                                variant="destructive"
                                className="bg-red-800 hover:bg-red-900 text-white ml-2"
                            >
                                Delete All
                            </Button>
                        </div>
                        <AddDocumentForm onAdd={() => fetchDocuments(page)} />
                    </div>

                    <EditDocumentModal
                        document={editingDoc}
                        isOpen={isEditOpen}
                        onClose={() => setIsEditOpen(false)}
                        onUpdate={() => fetchDocuments(page)}
                    />

                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3 w-4">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={documents.length > 0 && selectedIds.size === documents.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-3">Title</th>
                                        <th className="px-6 py-3">Source URL</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center">Loading documents...</td>
                                        </tr>
                                    ) : documents.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center">No documents found.</td>
                                        </tr>
                                    ) : (
                                        documents.map((doc) => (
                                            <tr key={doc.id} className={`hover:bg-gray-50 ${selectedIds.has(doc.id) ? 'bg-blue-50' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedIds.has(doc.id)}
                                                        onChange={() => toggleSelectOne(doc.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={doc.title}>
                                                    {doc.title || 'Untitled'}
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate">
                                                    <a href={doc.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                                        {doc.source_url}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.type === 'manual' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {doc.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleEdit(doc)}
                                                        className="text-blue-600 hover:text-blue-900 font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="text-red-600 hover:text-red-900 font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                    variant="outline"
                                    className="h-8 px-3"
                                >
                                    Previous
                                </Button>
                                <Button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                    variant="outline"
                                    className="h-8 px-3"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="queue">
                    <RedisQueueViewer />
                </TabsContent>
            </Tabs>
        </div>
    );
}
