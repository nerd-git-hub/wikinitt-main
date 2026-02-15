import sys
from app import get_retriever, format_docs

def search_nitt_func(query: str):
    print(f"Initializing retriever...")
    retriever = get_retriever()
    if not retriever:
        print("Failed to initialize retriever.")
        return

    print(f"Searching for: '{query}'...")
    
    # Debug: Check vectorstore count
    try:
        collection_data = retriever.vectorstore.get()
        ids = collection_data.get('ids', [])
        print(f"DEBUG: Vectorstore has {len(ids)} documents.")
    except Exception as e:
        print(f"DEBUG: Failed to get vectorstore count: {e}")

    docs = retriever.invoke(query)
    
    if not docs:
        print(f"No results found for query: '{query}'.")
        return
        
    print("\n--- Results ---\n")
    print(format_docs(docs))
    print("\n----------------")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = input("Enter search query: ")
    
    search_nitt_func(query)