# PC Power MCP Server on Vercel

Model Context Protocol (MCP) server built with Express.js that provides pc power tools.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/diegogtz03/pc-power-mcp&project-name=pc-power-mcp&repository-name=pc-power-mcp)

## Features

This MCP server provides tools to control your pc remotely:

- **get-pc-status**: Gets current PC's power status.
- **turn-pc-on**: Normal pc power on.
- **turn-pc-off**: Normal pc shutdonwn.
- **force-pc-off**: Used just in emergencies to simulate a long button press to force shutdown.

## Setting Up / Requirements
This MCP is an expansion of a previous project that involved a simple API and an ESP controller, to keep things simple, this MCP connects to that API, however, I'll provide later on another version which skips the API directly.

# [API project](https://github.com/Diegogtz03/PCPower) - API for WebSocket
- This project contains the instructions for setting up the API to use this project
    - Working on eliminating this part to just use this one-click deploy MCP, but will post once available :)

# [ESP-PC project](https://github.com/Diegogtz03/ESP-PC) - Physical Hardware
- This project contains the instructions for setting up the HW to be able to use this project

# Env
You might need to configure these manually if being deployed through the button above.

- Add your API base to the .env (API_BASE_URL)
- Add your API Auth header to the .env (AUTHORIZATION_HEADER) 
    - **This should be the same as in the API**

## API Endpoints

- `POST /mcp`: Handles incoming messages for the MCP protocol
