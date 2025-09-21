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

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
app.use(
  cors({
    origin: true,
    methods: "*",
    allowedHeaders: "Authorization, Origin, Content-Type, Accept, *",
  })
);
app.options("*", cors());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// MCP endpoint with better error handling and logging
app.post("/mcp", async (req: Request, res: Response) => {
  const requestId = req.body?.id || "unknown";
  console.log(`Received MCP request [${requestId}]:`, {
    method: req.body?.method,
    id: requestId,
    hasParams: !!req.body?.params
  });
  
  try {
    // Create new transport and server for each request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    
    const { server } = createServer();
    
    // Connect server to transport
    await server.connect(transport);
    
    // Set proper headers for MCP
    res.setHeader('Content-Type', 'application/json');
    
    await transport.handleRequest(req, res, req.body);
    console.log(`MCP request [${requestId}] handled successfully`);
    
    // Clean up
    await server.close();
  } catch (error) {
    console.error(`Error handling MCP request [${requestId}]:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: process.env.NODE_ENV === 'development' ? error : undefined
        },
        id: requestId,
      });
    }
  }
});

// OPTIONS handler for preflight requests
app.options("/mcp", (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

// Method not allowed handlers
const methodNotAllowed = (req: Request, res: Response) => {
  console.log(`Received ${req.method} request to /mcp - method not allowed`);
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Only POST requests are supported for MCP.",
    },
    id: null,
  });
};

app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);
app.put("/mcp", methodNotAllowed);
app.patch("/mcp", methodNotAllowed);

// Start server
app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint available at: http://localhost:${PORT}/mcp`);
});

// Handle server shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  console.log("Server shutdown complete");
  process.exit(0);
});
