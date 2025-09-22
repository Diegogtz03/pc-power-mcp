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

// Initialize MCP server once
const { server } = createServer();
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => Math.random().toString(36).substring(7),
});

// Connect the server to the transport once at startup
server.connect(transport).catch(console.error);

// Middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(process.cwd(), "public")));

// Enhanced CORS for MCP Inspector
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow localhost and any origin for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('mcp-inspector')) {
        return callback(null, true);
      }
      
      // Allow all origins in development
      return callback(null, true);
    },
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

// Preflight handler
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-MCP-*');
  res.sendStatus(200);
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

// MCP endpoint - FastMCP style stateless handling
app.post("/mcp", async (req: Request, res: Response) => {
  const requestId = req.body?.id || Math.random().toString(36).substring(7);
  
  console.log(`[MCP] Received request [${requestId}]:`, {
    method: req.body?.method || 'unknown',
    id: requestId,
    hasParams: !!req.body?.params,
    jsonrpc: req.body?.jsonrpc
  });
  
  try {
    // Set headers before processing
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle the MCP request using the shared transport
    await transport.handleRequest(req, res, req.body);
    
    console.log(`[MCP] Request [${requestId}] handled successfully`);
    
  } catch (error) {
    console.error(`[MCP] Error handling request [${requestId}]:`, error);
    
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
        id: requestId,
      };
      
      res.status(500).json(errorResponse);
    }
  }
});

// GET handler for MCP endpoint info (useful for debugging/discovery)
app.get("/mcp", (req: Request, res: Response) => {
  res.json({
    name: "pc-power-mcp",
    version: "1.0.0",
    description: "PC Power Control MCP Server",
    protocol: "model-context-protocol",
    endpoint: "/mcp",
    methods: ["POST"],
    tools: [
      { name: "get-pc-power-status", description: "Get user's PC power status" },
      { name: "turn-pc-on", description: "Turn user's PC on" },
      { name: "turn-pc-off", description: "Turn user's PC off" },
      { name: "force-pc-off", description: "Force user's PC off - Dangerous" }
    ],
    usage: {
      connect: `Connect MCP Inspector or other MCP clients to: ${req.protocol}://${req.get('host')}/mcp`,
      example: "Use MCP Inspector to test this server's capabilities"
    }
  });
});

// Method not allowed handler for other HTTP methods
const methodNotAllowed = (req: Request, res: Response) => {
  console.log(`[MCP] ${req.method} request to /mcp - method not allowed`);
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: `Method ${req.method} not allowed. Use GET for info or POST for MCP requests.`,
    },
    id: null,
  });
};

app.delete("/mcp", methodNotAllowed);
app.put("/mcp", methodNotAllowed);
app.patch("/mcp", methodNotAllowed);

// Start server
const httpServer = app.listen(PORT, () => {
  console.log(`PC Power MCP Server listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    // Close HTTP server
    httpServer.close(() => {
      console.log("HTTP server closed");
    });
    
    // Close MCP server
    await server.close();
    console.log("MCP server closed");
    
    console.log("✨ Server shutdown complete");
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
