import os
import asyncio
import httpx
from dotenv import load_dotenv
from fastmcp import FastMCP
from fastapi import FastAPI

# Load environment variables
load_dotenv()

# Configuration
API_BASE = os.getenv("API_BASE_URL")
AUTHORIZATION_HEADER = os.getenv("AUTHORIZATION_HEADER")
USER_AGENT = "pc-power-app/1.0"

mcp = FastMCP("PC Power Control", stateless_http=True)

async def make_request(url: str, method: str = "GET") -> str | None:
    """Make HTTP request to the ESP device"""
    headers = {
        "User-Agent": USER_AGENT,
        "Authorization": AUTHORIZATION_HEADER,
        "Accept": "application/json, text/plain, */*",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.request(method, url, headers=headers)
            response.raise_for_status()
            return response.text
    except Exception as error:
        print(f"Error making request: {error}")
        return None

@mcp.tool()
async def get_pc_power_status() -> str:
    """Get user's PC power status"""
    status_url = f"{API_BASE}/state"
    status_data = await make_request(status_url, "GET")
    
    if not status_data:
        return "Failed to retrieve status data, maybe ESP is offline."
    
    return f"PC is currently: {status_data}"

@mcp.tool()
async def turn_pc_on() -> str:
    """Turn user's PC on"""
    power_url = f"{API_BASE}/on"
    power_data = await make_request(power_url, "POST")
    
    if not power_data:
        return "Failed to retrieve power data, maybe ESP is offline."
    
    if power_data == "OK":
        return "PC is now turning on!"
    else:
        return "Failed to turn on the PC, maybe it's already on or ESP is offline."

@mcp.tool()
async def turn_pc_off() -> str:
    """Turn user's PC off"""
    power_url = f"{API_BASE}/off"
    power_data = await make_request(power_url, "POST")
    
    if not power_data:
        return "Failed to retrieve power data, maybe ESP is offline."
    
    if power_data == "OK":
        return "PC is now turning off!"
    else:
        return "Failed to turn off the PC, maybe it's already off or ESP is offline."

@mcp.tool()
async def force_pc_off() -> str:
    """Force user's PC off - Dangerous"""
    power_url = f"{API_BASE}/foff"
    power_data = await make_request(power_url, "POST")
    
    if not power_data:
        return "Failed to retrieve power data, maybe ESP is offline."
    
    if power_data == "OK":
        return "PC is now forcing turning off!"
    else:
        return "Failed to force off the PC, maybe it's already off or ESP is offline."

app = FastAPI(lifespan=lambda app: mcp.session_manager.run())
app.mount("/", mcp.http_app())

if __name__ == "__main__":
    mcp.run(transport='streamable-http')