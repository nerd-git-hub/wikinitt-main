from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse
import jwt
import pymongo
from bson import ObjectId
from fastapi import Depends
from app import get_chat_agent, get_retriever
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.documents import Document
import uvicorn
import json
import uuid
import shutil
import os
import pymupdf4llm
from utils import RagProcessor
from dotenv import load_dotenv
from app import POSTGRES_CONNECTION_STRING
import psycopg2
import chromadb


import redis
import pickle
load_dotenv()

redis_host = os.getenv('REDIS_HOST', 'localhost')
redis_port = int(os.getenv('REDIS_PORT', 6379))
redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=False)

class QueueStatus(BaseModel):
    queue_size: int
    processed_count: int
    scheduled_count: int
    queued_urls: list[str]

class AdminDocument(BaseModel):
    id: str
    source_url: str
    title: str
    content: str
    type: str

class CrawlRequest(BaseModel):
    pages: int = 20

class ChatRequest(BaseModel):
    message: str
    session_id: str

ENVIRONMENT = os.getenv("ENV", "development")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

# Database Connection
try:
    mongo_client = pymongo.MongoClient(MONGODB_URI)
    db = mongo_client.get_database(name="wikinitt")
    users_collection = db["users"]
    print("Connected to MongoDB")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    users_collection = None

retriever = get_retriever()

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ):
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        
        request.state.user_id = None
        
        if auth_header:
            try:
                # Extract token
                scheme, token = auth_header.split()
                if scheme.lower() != "bearer":
                    raise HTTPException(status_code=403, detail="Invalid authentication scheme")
                
                # Decode token
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                user_id = payload.get("user_id")
                
                if user_id:
                     request.state.user_id = user_id
                else:
                     return JSONResponse(status_code=403, content={"detail": "Invalid token payload"})
                     
            except (ValueError, jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
                print(f"Auth failed: {e}")
                return JSONResponse(status_code=403, content={"detail": "Invalid authentication token"})
        
        response = await call_next(request)
        return response

app = FastAPI(
    root_path="/chat" if ENVIRONMENT == "production" else ""
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)

# Dependencies
async def get_current_user(request: Request):
    user_id = request.state.user_id
    if not user_id:
        raise HTTPException(status_code=403, detail="Not authenticated")
    return user_id

async def get_admin_user(user_id: str = Depends(get_current_user)):
    if users_collection is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")
    print("user id is: ", user_id)
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
             raise HTTPException(status_code=403, detail="User not found")
        
        if not user.get("isAdmin", False):
             raise HTTPException(status_code=403, detail="Requires admin privileges")
             
        return user
    except Exception as e:
        print(f"Admin check failed: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during auth check")

sessions = {}
print("Initializing Agent...")
try:
    llm_with_tools, tools = get_chat_agent()
    tools_map = {t.name: t for t in tools}
    print("Agent Initialized Successfully.")
except Exception as e:
    print(f"Failed to initialize agent: {e}")
    llm_with_tools = None
    tools_map = {}

SYSTEM_MESSAGE = SystemMessage(content="""You are WikiNITT, an intelligent and deep-thinking AI assistant for NIT Trichy.

CORE RESPONSIBILITIES:
1. **Deep Reasoning**: You MUST think step-by-step before answering. Enclose your thinking process in `<thinking>` tags.
2. **Multi-Step & Multi-Hop**: If a user asks a complex question, break it down. You can use the `search_nitt_data` tool multiple times.
    - E.g., "First I will search for X... then I will search for Y...".
3. **Use Retrieved Info**: If the `search_nitt_data` tool returns ANY information that is relevant to the user's query, USE IT.
4. **Citations**: ALWAYS cite your sources. When you use information from the `search_nitt_data` tool, the context will have a "Source: <url>" line. You must include these URLs in your response as markdown links.

CRITICAL CONTEXT RULES:
- **Prioritize Current Query**: ALWAYS focus on the *latest* user message to determine what to search for.
- **Context vs. Switching**: Only use the previous chat history if the user uses pronouns (he, she, it, they, this, that) or explicitly refers back to the previous topic.
- **New Topic = New Search**: If the user asks about a NEW entity (e.g., asked about "Uma" before, now asks about "Vasu"), you MUST search for the NEW entity ("Vasu"). Do NOT search for the old entity ("Uma") again.
- **Query Formulation**: When searching, use specific keywords. E.g., if asking for "Vasu's email", search for "Vasu NIT Trichy email" or "Vasu faculty profile".

PROCESS:
- **Phase 1: Thinking**: Start immediately with `<thinking>`. Analyze the request. Check if the topic has changed from the previous turn.
- **Phase 2: Tool Execution**: If you need information, call `search_nitt_data`.
- **Phase 3: Refinement**: Analyze tool results in a new `<thinking>` block.
    - **CRITICAL**: If the tool returns "No results found" or similar, AND you have tried 1-2 plausible queries, **STOP**.
    - **PARTIAL DATA**: If a document looks like a fragment, a list, or a CV, **EXTRACT whatever facts you can**. Do not dismiss data just because it says "page 1 of 8" or looks cut off. If it mentions a name, a date, or a qualification, **USE IT**.
- **Phase 4: Final Answer**: Provide the final response to the user OUTSIDE the `<thinking>` tags.
""")

async def chat_generator(user_input: str, session_id: str):
    if not llm_with_tools:
        yield json.dumps({"error": "Agent not initialized"}) + "\n"
        return

    if session_id not in sessions:
        sessions[session_id] = []

    chat_history = sessions[session_id]
    messages = [SYSTEM_MESSAGE] + chat_history + [HumanMessage(content=user_input)]
    
    try:
        while True:
            full_response = None
            
            buffer = ""
            is_thinking = False
            
            for chunk in llm_with_tools.stream(messages):
                if full_response is None:
                    full_response = chunk
                else:
                    full_response += chunk
                
                content = chunk.content
                if content and isinstance(content, str):
                    buffer += content
                    
                    while True:
                        if is_thinking:
                            end_tag = "</thinking>"
                            if end_tag in buffer:
                                thought, rest = buffer.split(end_tag, 1)
                                yield json.dumps({"type": "thought_chunk", "content": thought}) + "\n"
                                buffer = rest
                                is_thinking = False
                            else:
                                # Check for partial end tag at the end
                                match_len = 0
                                for i in range(1, len(end_tag)):
                                    if buffer.endswith(end_tag[:i]):
                                        match_len = i
                                
                                if match_len > 0:
                                    to_yield = buffer[:-match_len]
                                    buffer = buffer[-match_len:]
                                    if to_yield:
                                        yield json.dumps({"type": "thought_chunk", "content": to_yield}) + "\n"
                                else:
                                    yield json.dumps({"type": "thought_chunk", "content": buffer}) + "\n"
                                    buffer = ""
                                break
                        else:
                            start_tag = "<thinking>"
                            if start_tag in buffer:
                                text, rest = buffer.split(start_tag, 1)
                                if text:
                                    yield json.dumps({"type": "text_chunk", "content": text}) + "\n"
                                buffer = rest
                                is_thinking = True
                            else:
                                # Check for partial start tag at the end
                                match_len = 0
                                for i in range(1, len(start_tag)):
                                    if buffer.endswith(start_tag[:i]):
                                        match_len = i
                                
                                if match_len > 0:
                                    to_yield = buffer[:-match_len]
                                    buffer = buffer[-match_len:]
                                    if to_yield:
                                        yield json.dumps({"type": "text_chunk", "content": to_yield}) + "\n"
                                else:
                                    yield json.dumps({"type": "text_chunk", "content": buffer}) + "\n"
                                    buffer = ""
                                break
            
            # Flush remaining buffer
            if buffer:
                if is_thinking:
                    yield json.dumps({"type": "thought_chunk", "content": buffer}) + "\n"
                else:
                    yield json.dumps({"type": "text_chunk", "content": buffer}) + "\n"

            messages.append(full_response)
            
            if full_response.tool_calls:
                if len(messages) > 30:
                    yield json.dumps({"type": "error", "content": "Max recursion limit reached."}) + "\n"
                    return

                for tool_call in full_response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    
                    if tool_name in tools_map:
                        yield json.dumps({"type": "status", "content": f"Searching: {tool_args.get('query', '...')}"}) + "\n"
                        
                        try:
                            # Execute tool
                            tool_result = tools_map[tool_name].invoke(tool_args)
                        except Exception as tool_err:
                            tool_result = f"Error executing tool: {tool_err}"
                        
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=str(tool_result)
                        ))
                    else:
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=f"Error: Tool '{tool_name}' not found."
                        ))
                continue
            
            else:
                sessions[session_id].append(HumanMessage(content=user_input))
                sessions[session_id].append(AIMessage(content=str(full_response.content)))
                break

    except Exception as e:
        print(f"Error processing chat: {e}")
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"

GROQ_API_KEYS = []
if os.getenv("GROQ_API_KEYS"):
    GROQ_API_KEYS = os.getenv("GROQ_API_KEYS", "").split(",")

rag_processor = RagProcessor(GROQ_API_KEYS)

@app.get("/admin/documents", dependencies=[Depends(get_admin_user)])
async def list_documents(page: int = 1, limit: int = 20, search: str = None):
    if not retriever:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    
    store = retriever.docstore
    
    all_keys = list(store.yield_keys())
    current_docs = []
    
    retrieved_docs = store.mget(all_keys)
    
    for i, doc in enumerate(retrieved_docs):
        if doc:
            if search:
                search_lower = search.lower()
                title_match = search_lower in doc.metadata.get("title", "").lower()
                content_match = search_lower in doc.page_content.lower()
                if not (title_match or content_match):
                    continue

            current_docs.append(AdminDocument(
                id=all_keys[i],
                source_url=doc.metadata.get("source_url", ""),
                title=doc.metadata.get("title", "Untitled"),
                content=doc.page_content,
                type=doc.metadata.get("content_type", "unknown")
            ))
            
    total_docs = len(current_docs)
    
    # Calculate slice
    start = (page - 1) * limit
    end = start + limit
    sliced_docs = current_docs[start:end]

    return {
        "items": sliced_docs,
        "total": total_docs,
        "page": page,
        "size": limit,
        "pages": (total_docs + limit - 1) // limit if limit > 0 else 1
    }

@app.post("/admin/parse-pdf", dependencies=[Depends(get_admin_user)])
async def parse_pdf(file: UploadFile = File(...)):
    temp_file = f"temp_{uuid.uuid4()}.pdf"
    try:
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print("Extracting base text with pymupdf4llm...")
        md_text = pymupdf4llm.to_markdown(temp_file)
        
        try:
            print("Extracting tables with GMFT...")
            from gmft.pdf_bindings import PyPDFium2Document
            from gmft.auto import AutoTableFormatter
            
            doc_gmft = PyPDFium2Document(temp_file)
            formatter = AutoTableFormatter()
            tables = formatter.extract(doc_gmft)
            
            if tables:
                table_mds = []
                for table in tables:
                    df = table.df
                    if not df.empty:
                        table_mds.append(df.to_markdown(index=False))
                
                if table_mds:
                    md_text += "\n\n## Detected Tables (High Quality Extraction)\n\n"
                    md_text += "\n\n".join(table_mds)
                    print(f"Appended {len(table_mds)} high-quality tables.")
            else:
                print("No tables detected by GMFT.")
                
            doc_gmft.close()

        except Exception as e:
            print(f"GMFT table extraction failed (using base text only): {e}")
        
        os.remove(temp_file)
        return {"text": md_text}
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=f"PDF Parsing failed: {str(e)}")

@app.post("/admin/documents", dependencies=[Depends(get_admin_user)])
async def add_document(doc: AdminDocument, process: bool = False):
    if not retriever:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    
    with open("debug_requests.log", "a") as f:
        f.write(f"[{uuid.uuid4()}] add_document called. Process: {process}. ID provided: {doc.id}. Title: {doc.title}\n")
    
    doc_id = doc.id if doc.id else str(uuid.uuid4())
    
    final_content = doc.content
    final_metadata = {
        "source_url": doc.source_url,
        "title": doc.title,
        "content_type": "manual"
    }
    
    if process:
        processed = rag_processor.process_document(doc.content, doc.source_url)
        if processed:
            final_content = processed["content"]
            final_metadata.update(processed["metadata"])
            final_metadata["content_type"] = "processed_manual"
        else:
             print("Warning: LLM processing failed or filtered content. Using original.")

    new_doc = Document(
        page_content=final_content,
        metadata=final_metadata
    )

    if len([new_doc]) != len([doc_id]):
         raise HTTPException(status_code=500, detail="Internal Error: Document/ID mismatch preprocessing.")
    try:
        if hasattr(retriever, 'aadd_documents'):
            await retriever.aadd_documents([new_doc])
        else:
            retriever.add_documents([new_doc])
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=f"Retriever Error: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Error: {str(e)}")

    return {"status": "success", "message": "Document added"}

@app.put("/admin/documents/{doc_id}", dependencies=[Depends(get_admin_user)])
async def update_document(doc_id: str, doc: AdminDocument, process: bool = False):
    if not retriever:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
        
    store = retriever.docstore
    existing = store.mget([doc_id])[0]
    if not existing:
         raise HTTPException(status_code=404, detail="Document not found")
         
    final_content = doc.content
    final_metadata = {
        "source_url": doc.source_url,
        "title": doc.title,
        "content_type": existing.metadata.get("content_type", "manual")
    }

    if process:
        processed = rag_processor.process_document(doc.content, doc.source_url)
        if processed:
            final_content = processed["content"]
            final_metadata.update(processed["metadata"])
            final_metadata["content_type"] = "processed_manual"
        else:
             print("Warning: LLM processing failed or filtered content. Using original.")

    new_doc = Document(
        page_content=final_content,
        metadata=final_metadata
    )
    
    try:
        id_key = getattr(retriever, "id_key", "doc_id")
        retriever.vectorstore.delete(where={id_key: doc_id})
    except Exception as e:
        print(f"Warning: Failed to cleanup vectorstore chunks for {doc_id}: {e}")

    store.mdelete([doc_id]) 
    
    retriever.add_documents([new_doc], ids=[doc_id])
    
    return {"status": "success", "message": "Document updated"}

@app.delete("/admin/documents/all", dependencies=[Depends(get_admin_user)])
async def delete_all_documents():
    if not retriever:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    
    try:
        try:
            with psycopg2.connect(POSTGRES_CONNECTION_STRING) as conn:
                with conn.cursor() as cur:
                    cur.execute("TRUNCATE TABLE public.doc_store")
                    print("DEBUG: Truncated public.doc_store")
                conn.commit()
        except Exception as pg_e:
            print(f"Postgres Delete Error: {pg_e}")
            raise HTTPException(status_code=500, detail=f"Postgres cleanup failed: {pg_e}")

        try:
            print("DEBUG: Attempting to wipe Chroma...")
            existing_ids = retriever.vectorstore.get()["ids"]
            
            if existing_ids:
                batch_size = 40000 
                for i in range(0, len(existing_ids), batch_size):
                    batch = existing_ids[i:i + batch_size]
                    retriever.vectorstore.delete(batch)
                print(f"DEBUG: Deleted {len(existing_ids)} embeddings from Chroma.")
            else:
                print("DEBUG: Chroma was already empty.")

        except Exception as chroma_e:
            print(f"Warning: Failed to cleanup vectorstore: {chroma_e}")
        
        return {"status": "success", "message": "All documents deleted from Postgres and Chroma."}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"CRITICAL Error in delete_all_documents: {e}")
        raise HTTPException(status_code=500, detail=f"Delete all failed: {str(e)}")

@app.delete("/admin/documents/{doc_id}", dependencies=[Depends(get_admin_user)])
async def delete_document(doc_id: str):
    if not retriever:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    
    store = retriever.docstore
    
    try:
        id_key = getattr(retriever, "id_key", "doc_id")
        retriever.vectorstore.delete(where={id_key: doc_id})
    except Exception as e:
        print(f"Warning: Failed to cleanup vectorstore chunks for {doc_id}: {e}")

    store.mdelete([doc_id])
    
    return {"status": "success", "message": "Document deleted"}

class DeleteDocumentsRequest(BaseModel):
    ids: list[str]

@app.post("/admin/documents/delete", dependencies=[Depends(get_admin_user)])
async def delete_documents(request: DeleteDocumentsRequest):
    if not retriever:
        raise HTTPException(status_code=500, detail="Retriever not initialized")
    
    store = retriever.docstore
    ids_to_delete = request.ids
    
    if not ids_to_delete:
         return {"status": "success", "message": "No documents to delete"}

    try:
        id_key = getattr(retriever, "id_key", "doc_id")
        for doc_id in ids_to_delete:
             retriever.vectorstore.delete(where={id_key: doc_id})
             
    except Exception as e:
        print(f"Warning: Failed to cleanup vectorstore chunks during bulk delete: {e}")

    try:
        store.mdelete(ids_to_delete)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docstore delete failed: {e}")
    
    return {"status": "success", "message": f"Deleted {len(ids_to_delete)} documents"}


@app.post("/admin/crawl", dependencies=[Depends(get_admin_user)])
async def trigger_crawl(request: CrawlRequest):
    import subprocess
    try:
        subprocess.Popen(
            ["scrapy", "crawl", "nitt", "-s", f"CLOSESPIDER_PAGECOUNT={request.pages}"],
            cwd="bablu" 
        )
        return {"status": "success", "message": "Crawl started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", dependencies=[Depends(get_current_user)])
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        chat_generator(request.message, request.session_id), 
        media_type="application/x-ndjson"
    )

@app.get("/admin/redis/queue", dependencies=[Depends(get_admin_user)])
async def get_redis_queue_status():
    try:
        spider_name = "nitt"
        queue_key = f"{spider_name}:requests"
        dupefilter_key = f"{spider_name}:dupefilter"
        start_urls_key = f"{spider_name}:start_urls"
        
        queue_type = redis_client.type(queue_key)
        queue_size = 0
        queued_urls = []
        
        raw_items = []
        
        if queue_type == b"zset":
            queue_size = redis_client.zcard(queue_key)
            raw_items = redis_client.zrange(queue_key, 0, 49)
            
        elif queue_type == b"list":
            queue_size = redis_client.llen(queue_key)
            raw_items = redis_client.lrange(queue_key, 0, 49)
        
        processed_count = redis_client.scard(dupefilter_key)
        
        scheduled_count = redis_client.llen(start_urls_key)
        
        for item in raw_items:
            try:
                obj = pickle.loads(item)
                if isinstance(obj, dict) and 'url' in obj:
                    queued_urls.append(obj['url'])
                elif hasattr(obj, 'url'):
                    queued_urls.append(obj.url)
                else:
                    queued_urls.append(str(obj)) 
            except Exception:
                try:
                    queued_urls.append(item.decode('utf-8', errors='ignore'))
                except:
                    queued_urls.append(str(item))

        return {
            "queue_size": queue_size,
            "processed_count": processed_count,
            "scheduled_count": scheduled_count,
            "queued_urls": queued_urls
        }

    except Exception as e:
        print(f"Redis Error: {e}")
        return {
            "queue_size": 0,
            "processed_count": 0,
            "scheduled_count": 0,
            "queued_urls": []
        }

@app.delete("/admin/redis/queue", dependencies=[Depends(get_admin_user)])
async def flush_redis_queue():
    try:
        spider_name = "nitt"
        keys = [
            f"{spider_name}:requests",
            f"{spider_name}:dupefilter",
            f"{spider_name}:start_urls"
        ]
        redis_client.delete(*keys)
        return {"status": "success", "message": "Redis queue flushed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to flush Redis: {e}")

class AddUrlRequest(BaseModel):
    url: str

@app.post("/admin/redis/queue", dependencies=[Depends(get_admin_user)])
async def add_url_to_queue(request: AddUrlRequest):
    try:
        spider_name = "nitt"
        start_urls_key = f"{spider_name}:start_urls"
        
        redis_client.lpush(start_urls_key, request.url)
        
        return {"status": "success", "message": f"Added {request.url} to queue"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add URL: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
