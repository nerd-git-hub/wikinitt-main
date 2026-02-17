'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CHAT_ENDPOINT } from '@/lib/chat';
import { useSession } from 'next-auth/react';

interface AdminDocument {
    id: string;
    source_url: string;
    title: string;
    type: string;
    content: string;
}

interface EditDocumentModalProps {
    document: AdminDocument | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function EditDocumentModal({ document, isOpen, onClose, onUpdate }: EditDocumentModalProps) {
    const [title, setTitle] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (document) {
            setTitle(document.title);
            setSourceUrl(document.source_url);
            setContent(document.content);
        }
    }, [document]);

    const { data: session } = useSession()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!document || !session) return;

        setLoading(true);
        try {
            const res = await fetch(`${CHAT_ENDPOINT}/admin/documents/${document.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.backendToken}`
                },
                body: JSON.stringify({
                    id: document.id,
                    title,
                    source_url: sourceUrl,
                    content,
                    type: document.type
                })
            });

            if (!res.ok) throw new Error('Failed to update document');

            onUpdate();
            onClose();
        } catch (err) {
            alert('Error updating document: ' + err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !document) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-900">Edit Document</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="edit-url">Source URL</Label>
                        <Input
                            id="edit-url"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label htmlFor="edit-content">Content</Label>
                        <textarea
                            id="edit-content"
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
