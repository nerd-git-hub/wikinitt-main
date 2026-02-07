import os
import sys

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_mistralai import ChatMistralAI
from langchain_core.tools import Tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

from dotenv import load_dotenv

load_dotenv()

DB_DIRECTORY = "nitt_vector_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

def format_docs(docs):
    """Helper to join retrieved document chunks into a single string."""
    formatted_docs = []
    for doc in docs:
        source = doc.metadata.get("source_url", "Unknown Source")
        content = doc.page_content.replace("\n", " ")
        formatted_docs.append(f"Content: {content}\nSource: {source}")
    return "\n\n".join(formatted_docs)

def get_chat_agent():
    if not MISTRAL_API_KEY:
        print("Error: MISTRAL_API_KEY not found. Please set it.")
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
        if not docs:
            return "No results found. The database does not contain information matching this query."
        return format_docs(docs)

    tool = Tool(
        name="search_nitt_data",
        func=search_nitt_func,
        description="Searches for information about NIT Trichy, courses, events, campus details, and academic regulations. Use this whenever you need factual information about the institute."
    )
    tools = [tool]
    
    llm = ChatMistralAI(
        model="mistral-small-latest",
        temperature=0.3,
        mistral_api_key=MISTRAL_API_KEY
    )
    
    llm_with_tools = llm.bind_tools(tools)
    return llm_with_tools, tools

def start_wikinitt_chat():
    if not MISTRAL_API_KEY:
        print("Error: MISTRAL_API_KEY not found. Please set it.")
        return

    if not os.path.exists(DB_DIRECTORY):
        print(f"Error: DB directory '{DB_DIRECTORY}' not found.")
        return

    print("Initializing Agent...")
    try:
        llm_with_tools, tools = get_chat_agent()
    except Exception as e:
        print(f"Error initializing agent: {e}")
        return

    tools_map = {t.name: t for t in tools}

    system_message = SystemMessage(content="""You are WikiNITT, an intelligent and deep-thinking AI assistant for NIT Trichy.

    CORE RESPONSIBILITIES:
    1. **Deep Reasoning**: Think step-by-step.
    2. **Use Retrieved Info**: If the `search_nitt_data` tool returns ANY information that is relevant to the user's query, USE IT. Do NOT say "I couldn't find specific information" if there is relevant content in the search results. Even partial matches are valuable.
    3. **Context Awareness**: Remember previous interactions.
    4. **Honesty**: Only if the search results range is completely irrelevant should you say you don't know.
    5. **Citations**: ALWAYS cite your sources. When you use information from the `search_nitt_data` tool, the context will have a "Source: <url>" line. You must include these URLs in your response as markdown links, e.g., [Source Title](url).

    PROCESS:
    - Step 1: Analyze the user's request.
    - Step 2: Use `search_nitt_data` to gather facts.
    - Step 3: Analyze the search results.
        - If you see the answer, state it clearly.
        - If you see related info, state it and mention it might be partial.
        - Do NOT be overly apologetic.
    - Step 4: Synthesize the final answer with CITATIONS.
    """)

    print("\n" + "="*50)
    print("🤖 WikiNITT is Ready! (Deep Agentic Mode - Mistral)")
    print("="*50 + "\n")

    chat_history = [] 

    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ["exit", "quit", "q"]:
                break
            
            messages = [system_message] + chat_history + [HumanMessage(content=user_input)]
            
            print("   (🧠 Thinking...)")
            
            # Dynamic Agent Loop
            while True:
                response = llm_with_tools.invoke(messages)
                messages.append(response)
                
                if not response.tool_calls:
                    final_answer = response.content
                    
                    if not final_answer or (isinstance(final_answer, str) and not final_answer.strip()):
                        print("   (⚠️ Model returned empty response. Retrying with a nudge...)")
                        messages.append(HumanMessage(content="Please provide your answer or use a tool."))
                        continue

                    print(f"\nWikiNITT: {final_answer}\n")
                    
                    chat_history.append(HumanMessage(content=user_input))
                    chat_history.append(AIMessage(content=str(final_answer)))
                    break
                
                if len(messages) > 20: 
                    print("   (⚠️ Max recursion depth reached. Stopping.)")
                    break

                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    
                    if tool_name in tools_map:
                        print(f"   (🛠️  Tool Call: {tool_name})") 
                        
                        try:
                            tool_result = tools_map[tool_name].invoke(tool_args)
                        except Exception as tool_err:
                            tool_result = f"Error executing tool: {tool_err}"
                        
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=str(tool_result)
                        ))
                    else:
                        print(f"   (⚠️ Unknown Tool: {tool_name})")
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=f"Error: Tool '{tool_name}' not found. Please use a valid tool."
                        ))

        except Exception as e:
            print(f"⚠️ Error: {e}")

if __name__ == "__main__":
    start_wikinitt_chat()