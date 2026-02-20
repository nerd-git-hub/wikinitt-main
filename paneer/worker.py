
import os
import time
import json
import redis
import logging
from app import get_retriever
from langchain_core.documents import Document
from dotenv import load_dotenv
from utils import RagProcessor

load_dotenv()

rag_processor = RagProcessor(None)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PaneerWorker")

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
RAG_QUEUE_KEY = "rag_update_queue"

def get_redis_client():
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
        r.ping()
        logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
        return r
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return None

def process_event(event, retriever):
    if not retriever:
        logger.error("Retriever is not initialized. Skipping event.")
        return

    try:
        event_type = event.get("type")
        article_id = event.get("article_id")
        
        if not article_id:
            logger.warning("Event missing article_id. Skipping.")
            return

        logger.info(f"Processing {event_type} event for article {article_id}")

        store = retriever.docstore
        
        try:
            id_key = getattr(retriever, "id_key", "doc_id")
            retriever.vectorstore.delete(where={id_key: article_id})
            store.mdelete([article_id])
            logger.info(f"Cleaned up existing data for {article_id}")
        except Exception as e:
            logger.warning(f"Cleanup failed (might be new doc): {e}")

        if event_type == "delete":
            logger.info(f"Deleted article {article_id} from RAG.")
            return

        if event_type in ["create", "update"]:
            content = event.get("content_markdown", "")
            title = event.get("title", "Untitled")
            source_url = event.get("source_url", "")
            slug = event.get("slug", "")

            metadata = {
                "source_url": source_url,
                "title": title,
                "slug": slug,
                "content_type": "article",
                "doc_id": article_id
            }

            try:
                logger.info(f"Processing document {title} via LLM...")
                processed = rag_processor.process_document(content, source_url)
                if processed:
                    content = processed["content"]
                    metadata.update(processed["metadata"])
                    metadata["content_type"] = "processed_article"
                    logger.info(f"LLM processing successful for {article_id}")
                else:
                    logger.warning(f"LLM processing discarded or failed for {article_id}. Using original content.")
            except Exception as pe:
                logger.error(f"Error during RAG LLM processing for {article_id}: {pe}. Using original.")

            doc = Document(page_content=content, metadata=metadata)
            
            retriever.add_documents([doc], ids=[article_id])
            logger.info(f"Indexed article {article_id} successfully.")

    except Exception as e:
        logger.error(f"Error processing event: {e}")

def main():
    logger.info("Starting Paneer RAG Worker...")
    
    time.sleep(10) 

    redis_client = get_redis_client()
    if not redis_client:
        logger.fatal("Could not connect to Redis. Exiting.")
        return

    retriever = get_retriever()
    if not retriever:
        logger.fatal("Could not initialize Retriever. Exiting.")
        return

    logger.info("Worker ready. listening for events...")

    while True:
        try:
            result = redis_client.brpop(RAG_QUEUE_KEY, timeout=5)
            
            if result:
                _, data = result
                try:
                    event = json.loads(data)
                    process_event(event, retriever)
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode JSON: {data}")
                except Exception as e:
                    logger.error(f"Unexpected error processing event: {e}")
            
        except redis.exceptions.ConnectionError:
            logger.error("Redis connection lost. Retrying in 5s...")
            time.sleep(5)
            redis_client = get_redis_client()
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
