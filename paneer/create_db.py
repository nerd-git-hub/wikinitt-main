import os
import json 
from tqdm import tqdm
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from bs4 import BeautifulSoup

DATA_DIRECTORY = "bablu/nitt_pdfs"
DB_DIRECTORY = "nitt_vector_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def load_documents(directory):
    documents = []
    
    if not os.path.exists(directory):
        print(f"Error: Directory '{directory}' not found.")
        return []

    all_files = os.listdir(directory)
    content_files = [f for f in all_files if f.endswith(('.html', '.pdf'))]
    
    print(f"Found {len(content_files)} total files.")
    print(f"Applying Junk Filter...")
    
            
    print(f"Processing {len(all_files)} valid files (Skipped {len(content_files) - len(all_files)} junk files)")

    for filename in tqdm(all_files, desc="Ingesting", unit="file"):
        file_path = os.path.join(directory, filename)
        
        base_name = os.path.splitext(filename)[0]
        meta_path = os.path.join(directory, f"{base_name}.meta.json")
        
        source_url = "Unknown Source"
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta_data = json.load(f)
                    source_url = meta_data.get("url", "Unknown Source")
            except Exception:
                pass

        try:
            if filename.endswith(".html"):
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    soup = BeautifulSoup(f.read(), "html.parser")
                
                for script in soup(["script", "style", "header", "footer", "nav", "form", "iframe", "noscript", "svg"]):
                    script.extract()
                
                for div in soup.find_all("div", class_=["navbar", "menu", "sidebar", "footer", "header", "breadcrumb"]):
                    div.extract()

                text = soup.get_text(separator="\n")
                
                clean_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
                
                junk_phrases = [
                    "Other Links", "Tenders and Notices", "Job Opportunities", "RTI", "Alumni", "Sitemap", "Contact Us",
                    "National Institute of Technology", "Tiruchirappalli", "Tamil Nadu", "India"
                ]
                
                if any(phrase in clean_text[:200] for phrase in junk_phrases) and len(clean_text) < 500:
                    continue

                if len(clean_text) < 100: 
                    continue

                doc = Document(
                    page_content=clean_text, 
                    metadata={
                        "source": filename, 
                        "source_url": source_url,
                        "type": "html"
                    }
                )
                documents.append(doc)

            elif filename.endswith(".pdf"):
                try:
                    pdf_docs = extract_text_from_pdf_with_ocr(file_path)
                    
                    for doc in pdf_docs:
                        doc.metadata["source"] = filename
                        doc.metadata["type"] = "pdf"
                        doc.metadata["source_url"] = source_url
                        documents.append(doc)
                except Exception as e:
                    print(f"Error processing PDF {filename}: {e}")
                    continue

        except Exception as e:
            continue
            
    return documents

def extract_text_from_pdf_with_ocr(file_path):
    """
    Extracts text from a PDF file, using OCR if necessary.
    """
    text = ""
    pages = []
    MAX_OCR_PAGES = 10 

    try:
        loader = PyMuPDFLoader(file_path)
        pages = loader.load()
        text = "\n".join([p.page_content for p in pages])
        
        if len(text.strip()) > 50 * len(pages): 
             return pages

        print(f"\n   ⚠️  Low text detected in {os.path.basename(file_path)} ({len(pages)} pages). Falling back to OCR...")
        
    except Exception as e:
        print(f"\n   ⚠️  Standard PDF load failed: {e}. attempting OCR blindly...")
        pages = [] 

    # 2. OCR Fallback
    try:
        from pdf2image import convert_from_path, pdfinfo_from_path
        import pytesseract
        
        if not pages:
            try:
                info = pdfinfo_from_path(file_path)
                page_count = info["Pages"]
            except:
                page_count = 5 
        else:
            page_count = len(pages)

        if page_count > MAX_OCR_PAGES:
            print(f"   ❌ Skipping OCR: File too large ({page_count} pages). Limit is {MAX_OCR_PAGES}.")
            return []

        print(f"   Converting PDF to images...", end="\r")
        images = convert_from_path(file_path)
        ocr_docs = []
        
        print(f"   Running OCR on {len(images)} pages: ", end="", flush=True)
        
        for i, image in enumerate(images):
            print(".", end="", flush=True) 
            
            page_text = pytesseract.image_to_string(image)
            if page_text.strip():
                doc = Document(
                    page_content=page_text,
                    metadata={"source": file_path, "page": i}
                )
                ocr_docs.append(doc)
                
        print(" Done!")
        return ocr_docs
            
    except ImportError:
        print("\n   ❌ OCR dependencies missing (install pdf2image & pytesseract).")
        return []
    except Exception as e:
        print(f"\n   ❌ OCR failed: {e}")
        return []


def create_vector_db(documents):
    if not documents:
        print("No documents to process!")
        return

    print(f"Splitting {len(documents)} documents into chunks...")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = text_splitter.split_documents(documents)
    print(f"Generated {len(chunks)} chunks.")

    print("Initializing Embedding Model...")
    embedding_function = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    print(f"Saving to ChromaDB at '{DB_DIRECTORY}'...")
    
    BATCH_SIZE = 5000
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        print(f"   Writing batch {i} to {i+len(batch)}...")
        Chroma.from_documents(
            documents=batch,
            embedding=embedding_function,
            persist_directory=DB_DIRECTORY
        )
        
    print("✅ Ingestion Complete! Database is ready.")

if __name__ == "__main__":
    raw_docs = load_documents(DATA_DIRECTORY)
    create_vector_db(raw_docs)