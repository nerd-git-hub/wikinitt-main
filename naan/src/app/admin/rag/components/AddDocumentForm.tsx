'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Loader2, Sparkles } from 'lucide-react';
import { CHAT_ENDPOINT } from '@/lib/chat';
import { useSession } from 'next-auth/react';

export default function AddDocumentForm({ onAdd }: { onAdd: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'manual' | 'pdf'>('manual');

    const [title, setTitle] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [content, setContent] = useState('');
    const [processWithLLM, setProcessWithLLM] = useState(false);

    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const { data: session } = useSession();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !session) return;

        setParsing(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${CHAT_ENDPOINT}/admin/parse-pdf`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${session.backendToken}`
                }
            });

            if (!res.ok) throw new Error('Failed to parse PDF');
            const data = await res.json();

            setContent(data.text);
            setTitle(file.name.replace('.pdf', ''));
            // Auto-enable LLM processing for PDFs as it helps simple raw text
            setProcessWithLLM(true);
        } catch (err) {
            alert('Error parsing PDF: ' + err);
        } finally {
            setParsing(false);
        }
    };

    const isSubmittingRef = React.useRef(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmittingRef.current || !session) return;
        isSubmittingRef.current = true;
        setLoading(true);

        try {
            // Append process query param
            const res = await fetch(`${CHAT_ENDPOINT}/admin/documents?process=${processWithLLM}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.backendToken}`
                },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    title,
                    source_url: sourceUrl,
                    content,
                    type: mode === 'pdf' ? 'pdf_upload' : 'manual'
                })
            });

            if (!res.ok) throw new Error('Failed to add document');

            setTitle('');
            setSourceUrl('');
            setContent('');
            setProcessWithLLM(false);
            setIsOpen(false);
            onAdd(); // Refresh list
        } catch (err) {
            alert('Error adding document: ' + err);
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    if (!isOpen) {
        return (
            <Button onClick={() => setIsOpen(true)} className="mb-4">
                + Add New Document
            </Button>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Add New Document</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('manual')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Manual Entry
                    </button>
                    <button
                        onClick={() => setMode('pdf')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'pdf' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Upload PDF
                    </button>
                </div>
            </div>

            {mode === 'pdf' && (
                <div className="mb-6 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="pdf-upload"
                    />
                    <label
                        htmlFor="pdf-upload"
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                        {parsing ? (
                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                        ) : (
                            <Upload className="h-8 w-8 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-600">
                            {parsing ? "Parsing PDF..." : "Click to upload a PDF to extract text"}
                        </span>
                    </label>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g. Hostel Regulations 2024"
                        />
                    </div>

                    <div>
                        <Label htmlFor="url">Source URL</Label>
                        <Input
                            id="url"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            placeholder="https://nitt.edu/..."
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <Label htmlFor="content">Content</Label>
                        {parsing && <span className="text-xs text-blue-500 animate-pulse">Extracting text...</span>}
                    </div>
                    <textarea
                        id="content"
                        className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        placeholder={mode === 'pdf' ? "PDF content will appear here after upload..." : "Paste content here..."}
                    />
                </div>

                <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <input
                        type="checkbox"
                        id="process-llm"
                        checked={processWithLLM}
                        onChange={(e) => setProcessWithLLM(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                        htmlFor="process-llm"
                        className="text-sm font-medium text-blue-900 flex items-center gap-2 cursor-pointer select-none"
                    >
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        Process with LLM (Generate Questions & Rewrite)
                    </label>
                </div>

                <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || parsing || !content}>
                        {loading ? 'Adding...' : 'Save Document'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
