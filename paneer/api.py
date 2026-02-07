from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app import get_chat_agent
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
import uvicorn
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class ChatRequest(BaseModel):
    message: str
    session_id: str

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
            
            for chunk in llm_with_tools.stream(messages):
                if full_response is None:
                    full_response = chunk
                else:
                    full_response += chunk
                
                if chunk.content:
                    content = chunk.content
                    if isinstance(content, str) and content:
                        yield json.dumps({"type": "text_chunk", "content": content}) + "\n"
            
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

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        chat_generator(request.message, request.session_id), 
        media_type="application/x-ndjson"
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
