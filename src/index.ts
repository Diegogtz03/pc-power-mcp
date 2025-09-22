import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./create-server.js";

// Environment setup
dotenv.config();
const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

// Middleware setup
app.use(express.static(path.join(process.cwd(), "public")));

// Enhanced CORS for MCP Inspector
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-MCP-*'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Create a single MCP server instance and transport
const { server } = createServer();
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator() {
    return 'default-session';
  },
});

// Connect server to transport once at startup
server.connect(transport).then(() => {
  console.log("[MCP] Server connected to transport successfully");
}).catch((error) => {
  console.error("[MCP] Failed to connect server to transport:", error);
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    server: "pc-power-mcp",
    version: "1.0.0"
  });
});

// Main MCP endpoint - handles both SSE and HTTP POST like FastMCP
app.all("/mcp", async (req: Request, res: Response) => {
  console.log(`[MCP] ${req.method} request from ${req.headers['user-agent'] || 'unknown'}`);
  console.log(`[MCP] Accept header: ${req.headers.accept}`);
  console.log(`[MCP] Content-Type: ${req.headers['content-type']}`);
  
  if (req.body && req.body.method) {
    console.log(`[MCP] JSON-RPC method: ${req.body.method}`);
  }
  
  try {
    // Use the single transport instance for all requests
    // The transport will handle session management internally
    await transport.handleRequest(req, res, req.body || {});
    
    console.log(`[MCP] Request handled successfully`);
    
  } catch (error) {
    console.error(`[MCP] Error handling request:`, error);
    
    if (!res.headersSent) {
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: process.env.NODE_ENV === 'development' ? {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          } : undefined
        },
        id: req.body?.id || null,
      };
      
      res.status(500).json(errorResponse);
    }
  }
});

// Server info endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "pc-power-mcp",
    version: "1.0.0",
    description: "PC Power Control MCP Server",
    protocol: "model-context-protocol",
    endpoint: "/mcp",
    methods: ["GET", "POST"],
    transports: ["http", "sse"],
    tools: [
      { name: "get-pc-power-status", description: "Get user's PC power status" },
      { name: "turn-pc-on", description: "Turn user's PC on" },
      { name: "turn-pc-off", description: "Turn user's PC off" },
      { name: "force-pc-off", description: "Force user's PC off - Dangerous" }
    ],
    usage: {
      http: `Connect MCP clients to: ${req.protocol}://${req.get('host')}/mcp`,
      sse: `Connect MCP Inspector to: ${req.protocol}://${req.get('host')}/mcp`,
      example: "Use MCP Inspector to test this server's capabilities"
    }
  });
});

// Start server
const httpServer = app.listen(PORT, () => {
  console.log(`PC Power MCP Server listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    console.log("Shutting down MCP server...");
    
    httpServer.close(() => {
      console.log("HTTP server closed");
    });
    
    await server.close();
    console.log("MCP server closed");
    
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM, shutting down...");
  process.kill(process.pid, "SIGINT");
});
