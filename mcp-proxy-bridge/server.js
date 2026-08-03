import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
    console.error("FATAL: AUTH_TOKEN environment variable is not set.");
    process.exit(1);
}

const app = express();
app.use(express.json());

// Security Middleware
app.use(['/sse', '/message'], (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// MCP Client (Internal)
const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-cli']
});

const mcpClient = new Client({
    name: "proxy-client",
    version: "1.0.0"
}, {
    capabilities: {}
});

// MCP Server (External)
const mcpServer = new Server({
    name: "proxy-server",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {}
    }
});

mcpServer.setRequestHandler(ListToolsRequestSchema, async (request) => {
    return await mcpClient.listTools();
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await mcpClient.callTool(request.params);
});

// Track transports by session ID or keep a global one since this proxy
// might support multiple connections
const activeTransports = new Map();

// HTTP/SSE Transports
app.get('/sse', async (req, res) => {
    try {
        const sseTransport = new SSEServerTransport('/message', res);
        await mcpServer.connect(sseTransport);

        // Store transport by sessionId
        activeTransports.set(sseTransport.sessionId, sseTransport);

        // Remove transport when closed
        res.on('close', () => {
            activeTransports.delete(sseTransport.sessionId);
        });
    } catch (err) {
        console.error("Error setting up SSE:", err);
        res.status(500).end();
    }
});

app.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId;

    // In SDK 1.0.1, SSE endpoint generated is '/message?sessionId=...'
    // Alternatively, if multiple clients aren't the focus, we can route to the single one.
    let transportToUse;

    if (sessionId) {
        transportToUse = activeTransports.get(sessionId);
    } else {
        // Fallback for single connection
        transportToUse = Array.from(activeTransports.values())[0];
    }

    if (!transportToUse) {
        return res.status(404).send('Session not found');
    }

    try {
        await transportToUse.handlePostMessage(req, res);
    } catch (err) {
        console.error("Error handling post message:", err);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
});

async function start() {
    try {
        await mcpClient.connect(transport);
        console.log("Connected to internal Stdio MCP Server");

        app.listen(PORT, () => {
            console.log(`Proxy server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

start();
