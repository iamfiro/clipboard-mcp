import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import 'dotenv/config'

const server = new McpServer(
    {
        name: 'parcel-tracker',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {
                track_delivery: {
                    title: 'Track Delivery',
                    description: 'Track a delivery by its code and carrier.',
                    inputSchema: z.object({
                        code: z.string().describe('The parcel code to delivery tracking.'),
                        carrier: z.string().describe('The carrier of the parcel.'),
                    }),
                    outputSchema: z.object({
                        content: z.array(
                            z.object({
                                type: z.string().describe('The type of content, e.g., "text".'),
                                text: z.string().describe('The content text.'),
                            })
                        ).describe('The content of the response.'),
                    }),
                }
            }
        }
    }
);

const inputSchema = {
    code: z.string().describe('The parcel code to delivery tracking.'),
    carrier: z.string().describe('The carrier of the parcel.'),
}

async function register(number, carrier) {
    const response = await fetch('https://api.17track.net/track/v2.2/register', {
        method: 'POST',
        headers: {
            '17token': process.env['17TRACK_KEY'] || '',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([
            {
                number: number,
                carrier: carrier, 
            }
        ])
    })

    const json = await response.json();

    return json
}

async function getDelivery(code, carrier) {
    const response = fetch(`https://api.17track.net/track/v2.2/gettrackinfo`, {
        method: 'POST',
        headers: {
            '17token': process.env['17TRACK_KEY'] || '',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([
            {
                number: code,
                carrier: carrier,
            }
        ])
    })

    const json = await response.json();

    return json;
}

async function trackingDelivery(args) {
    // await register(code, carrier).then(() => {
    //     return getDelivery(code, carrier);
    // }).then(() => {
    //     getDelivery(code, carrier).then((data) => {
    //         return {
    //             content: [{ type: "text", text: JSON.stringify(data) }]
    //         };
    //     });
    // }).catch((error) => {
    //     return {
    //         content: [{ type: "text", text: `Error: ${error.message}` }]
    //     };
    // });

    const {code, carrier} = args;

    try {
        await register(code, carrier);
        const data = await getDelivery(code, carrier);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(data, null, 2)
            }]
        }
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: "Error tracking delivery: " + error.message,
            }]
        }
    }
}

server.tool("track_delivery", {
    title: 'Track Delivery',
    description: 'Track a delivery by its code and carrier.',
    inputSchema,
}, trackingDelivery);

const transport = new StdioServerTransport(server);
await server.connect(transport);