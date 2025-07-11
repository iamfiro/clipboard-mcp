#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const config = require("./config.json");
const apiToken = config.apiToken;
const TRACKER_API_BASE_URL = "https://api.17track.net/track/v2.2";
const USER_AGENT = "MCP-Clipboardy/1.0.0";
const server = new McpServer({
    name: "parcel",
    version: "1.0.0",
    capabilities: {
        resource: {},
        tools: {}
    }
});
async function register(args) {
    const { number, carrier } = args;
    const response = await fetch(`${TRACKER_API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            '17token': apiToken,
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT
        },
        body: JSON.stringify([
            {
                number,
                carrier: carrier || 'auto'
            }
        ])
    });
    const json = await response.json();
    return json;
}
async function getDelivery(args) {
    const { number, carrier } = args;
    const response = await fetch(`${TRACKER_API_BASE_URL}/gettrackinfo`, {
        method: 'POST',
        headers: {
            '17token': apiToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([
            {
                number,
                carrier: carrier || 'auto'
            }
        ])
    });
    const json = await response.json();
    return json;
}
const trackingDelivery = async (args, _extra) => {
    const { number, carrier } = args;
    try {
        await register({ number, carrier });
        const data = await getDelivery({ number, carrier });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2)
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: "Error tracking delivery: " + (error instanceof Error ? error.message : String(error))
                }
            ]
        };
    }
};
server.tool("tracking-delivery", "Track a parcel delivery", {
    number: z.string().describe("The tracking number of the parcel"),
    carrier: z.string().optional().describe("The carrier of the parcel (optional, 'auto' by default)")
}, trackingDelivery);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
