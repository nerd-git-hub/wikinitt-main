import os
import sys

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import Tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

from dotenv import load_dotenv

load_dotenv()

DB_DIRECTORY = "nitt_vector_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")

def format_docs(docs):
    """Helper to join retrieved document chunks into a single string."""
    return "\n\n".join(doc.page_content for doc in docs)

def start_wikinitt_chat():
    if not GOOGLE_API_KEY:
        print("Error: GOOGLE_API_KEY not found. Please set it.")
        return

    if not os.path.exists(DB_DIRECTORY):
        print(f"Error: DB directory '{DB_DIRECTORY}' not found.")
        return

    print("Loading Embedding Model...")
    embedding_function = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    print(f"Loading Database...")
    vector_db = Chroma(
        persist_directory=DB_DIRECTORY, 
        embedding_function=embedding_function
    )
    retriever = vector_db.as_retriever(search_kwargs={"k": 5})
    
    def search_nitt_func(query: str):
        """Searches for information about NIT Trichy."""
        print(f"   (🔍 Searching: {query})")
        docs = retriever.invoke(query)
        return format_docs(docs)

    tool = Tool(
        name="search_nitt_data",
        func=search_nitt_func,
        description="Searches for information about NIT Trichy, courses, events, campus details, and academic regulations. Use this whenever you need factual information about the institute."
    )
    tools = [tool]
    tools_map = {t.name: t for t in tools}

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.3,
        google_api_key=GOOGLE_API_KEY
    )
    
    llm_with_tools = llm.bind_tools(tools)

    system_message = SystemMessage(content="""You are WikiNITT, the helpful and intelligent AI assistant for NIT Trichy.

    CORE INSTRUCTIONS:
    1. **Deep Thinking**: Before answering, verify if you have enough information. If not, use the `search_nitt_data` tool to find it.
    2. **Chat Awareness**: The conversation history is provided.
    3. **Honesty**: If the tool doesn't return relevant info, admit you don't know rather than hallucinating.
    4. **Friendliness**: Be polite and concise.
    """)

    print("\n" + "="*50)
    print("🤖 WikiNITT is Ready! (Agentic Mode - LCEL)")
    print("="*50 + "\n")

    chat_history = [] 

    while True:
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit", "q"]:
            break
        
        try:
            messages = [system_message] + chat_history + [HumanMessage(content=user_input)]
            
            response_1 = llm_with_tools.invoke(messages)
            
            final_answer = ""
            
            if response_1.tool_calls:
                messages.append(response_1)
                
                for tool_call in response_1.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    
                    if tool_name in tools_map:
                        tool_result = tools_map[tool_name].invoke(tool_args)
                        
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=tool_result
                        ))
                
                response_2 = llm_with_tools.invoke(messages)
                final_content = response_2.content
            else:
                final_content = response_1.content
            
            final_answer = ""
            if isinstance(final_content, str):
                final_answer = final_content
            elif isinstance(final_content, list):
                final_answer = "".join([
                    part.get("text", "") for part in final_content 
                    if isinstance(part, dict) and "text" in part
                ])
            else:
                final_answer = str(final_content)
            
            print(f"\nWikiNITT: {final_answer}\n")

            chat_history.append(HumanMessage(content=user_input))
            chat_history.append(AIMessage(content=final_answer))

        except Exception as e:
            print(f"⚠️ Error: {e}")

if __name__ == "__main__":
    start_wikinitt_chat()