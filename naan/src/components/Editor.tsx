"use client";

import { useState, useRef } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { UPLOAD_USER_IMAGE_MUTATION } from "@/queries/community";
import { print } from "graphql";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
  preview?: "live" | "edit" | "preview";
  uploadMutation?: any;
}

export default function Editor({
  value,
  onChange,
  height = 400,
  placeholder = "Write your post (Markdown supported)...",
  uploadMutation = UPLOAD_USER_IMAGE_MUTATION,
}: EditorProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!session?.backendToken) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      const query =
        typeof uploadMutation === "string"
          ? uploadMutation
          : print(uploadMutation);
      const operations = {
        query,
        variables: {
          file: null,
        },
      };
      formData.append("operations", JSON.stringify(operations));
      formData.append("map", JSON.stringify({ "0": ["variables.file"] }));
      formData.append("0", file);

      const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_API_URL!, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data.uploadImage || result.data.uploadUserImage;
    },
    onMutate: () => setIsUploading(true),
    onSettled: () => setIsUploading(false),
  });

  const handleImageUpload = async (file: File) => {
    try {
      const url = await uploadImageMutation.mutateAsync(file);
      return url;
    } catch (error) {
      console.error("Failed to upload image", error);
      alert("Failed to upload image");
      return "";
    }
  };

  const onPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = await handleImageUpload(file);
          if (url) {
            const imageMarkdown = `![image](${url})`;
            insertText(imageMarkdown);
          }
        }
      }
    }
  };

  const insertText = (text: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue =
      value.substring(0, start) +
      text +
      value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white w-full">
      <div className="flex items-center justify-between px-2 bg-gray-50 border-b border-gray-200">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === "write"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === "preview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            Preview
          </button>
        </div>

        {activeTab === "write" && (
          <div className="flex items-center py-1">
            <button
              type="button"
              onClick={() => document.getElementById("editor-image-upload-trigger")?.click()}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"
              title="Upload Image"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>
            <input
              type="file"
              id="editor-image-upload-trigger"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const url = await handleImageUpload(e.target.files[0]);
                  if (url) {
                    const imageMarkdown = `![image](${url})`;
                    insertText(imageMarkdown);
                  }
                }
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      <div
        className="relative w-full"
        style={{ height: height ? `${height}px` : "auto", minHeight: "150px" }}
      >
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={onPaste}
            placeholder={placeholder}
            className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm"
          />
        ) : (
          <div className="w-full h-full p-4 overflow-y-auto prose max-w-none">
            <div data-color-mode="light" className="article-markdown">
              <Markdown
                remarkPlugins={[remarkBreaks]}
                rehypePlugins={[rehypeSlug, rehypeRaw]}
              >
                {value || "*Nothing to preview*"}
              </Markdown>
            </div>

            <style jsx global>{`
              .article-markdown {
                background: transparent !important;
                color: #333 !important;
                font-family: var(--font-lato, sans-serif) !important;
                line-height: 1.6 !important;
              }
              .article-markdown h1, 
              .article-markdown h2, 
              .article-markdown h3 {
                border-bottom: none !important;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
              }
              .article-markdown img {
                max-width: 100%;
                border-radius: 8px;
                margin: 1rem 0;
              }
              .article-markdown a {
                color: #4f46e5;
                text-decoration: underline;
              }
              .article-markdown blockquote {
                border-left-color: #e5e7eb;
              }
              .article-markdown code {
                background-color: #f3f4f6;
                padding: 0.2em 0.4em;
                border-radius: 4px;
                font-size: 0.9em;
              }
              .article-markdown pre {
                background-color: #1f2937;
                color: #f3f4f6;
                padding: 1em;
                border-radius: 8px;
                overflow-x: auto;
              }
              .article-markdown pre code {
                background-color: transparent;
                padding: 0;
                color: inherit;
              }
            `}</style>
          </div>
        )}
      </div>

      {activeTab === "write" && (
        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>Markdown supported</span>
          <span>Paste or drag images to upload</span>
        </div>
      )}
    </div>
  );
}
