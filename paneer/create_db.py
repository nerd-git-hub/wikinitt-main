import os
from tqdm import tqdm  # <--- Import the progress bar library
from langchain_community.document_loaders import PyPDFLoader, BSHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from bs4 import BeautifulSoup

DATA_DIRECTORY = "nitt_data_bfs"
DB_DIRECTORY = "nitt_vector_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

def load_documents(directory):
    """
    Loops through the folder and loads HTML and PDF files.
    Returns a list of LangChain 'Document' objects.
    """
    documents = []
    
    if not os.path.exists(directory):
        print(f"Error: Directory '{directory}' not found.")
        return []

    files = [f for f in os.listdir(directory) if f.endswith(('.html', '.pdf'))]
    print(f"Found {len(files)} files in {directory}. Starting load...")
    
    for filename in tqdm(files, desc="Processing Files", unit="file"):
        file_path = os.path.join(directory, filename)
        
        try:
            if filename.endswith(".html"):
                with open(file_path, "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f.read(), "html.parser")
                
                for script in soup(["script", "style", "header", "footer", "nav"]):
                    script.extract()
                
                text = soup.get_text(separator="\n")
                clean_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
                
                if clean_text:
                    doc = Document(page_content=clean_text, metadata={"source": filename, "type": "html"})
                    documents.append(doc)

            elif filename.endswith(".pdf"):
                loader = PyPDFLoader(file_path)
                pdf_docs = loader.load()
                
                for doc in pdf_docs:
                    doc.metadata["source"] = filename
                    doc.metadata["type"] = "pdf"
                    documents.append(doc)

        except Exception as e:
            tqdm.write(f"Error loading {filename}: {e}")
            
    return documents

def create_vector_db(documents):
    """
    Chunks the documents and saves them into ChromaDB.
    """
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

    print("Initializing Embedding Model (this downloads the model once)...")
    embedding_function = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    print(f"Saving to Vector Database at '{DB_DIRECTORY}'...")
    Chroma.from_documents(
        documents=chunks,
        embedding=embedding_function,
        persist_directory=DB_DIRECTORY
    )
    print("Ingestion Complete! Database is ready.")

if __name__ == "__main__":
    raw_docs = load_documents(DATA_DIRECTORY)
    print(f"Loaded {len(raw_docs)} raw documents.")
    
    create_vector_db(raw_docs)