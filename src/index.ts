import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { parse as parseCsv } from "csv-parse/sync";
import Fuse from "fuse.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  throw new Error(`Missing config.json next to ${__filename}`);
}
const { apiToken } = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const carriersCsvPath = path.join(__dirname, "carriers.csv");
if (!fs.existsSync(carriersCsvPath)) {
  throw new Error("carriers.csv not found - make sure you placed the file next to the script");
}

interface CarrierRow {
  key: string;
  name_en: string;
  name_cn: string;
  name_hk: string;
  url: string;
}

const carrierRows: CarrierRow[] = parseCsv(fs.readFileSync(carriersCsvPath), {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true,
});

type CarrierMap = Map<string, number>;
const carrierNameToId: CarrierMap = new Map();
for (const row of carrierRows) {
  const id = Number(row.key);
  const add = (name: string) => {
    if (name) carrierNameToId.set(name.toLowerCase(), id);
  };
  add(row.name_en);
  add(row.name_cn);
  add(row.name_hk);
}

const fuse = new Fuse(carrierRows, {
  keys: ["name_en", "name_cn", "name_hk"],
  threshold: 0.4,
  includeScore: true,
});

function resolveCarrierByName(name: string): number | undefined {
  const exact = carrierNameToId.get(name.toLowerCase());
  if (exact) return exact;
  
  const fuzzy = fuse.search(name).at(0);
  if (fuzzy && fuzzy.score! <= 0.25) {
    return Number((fuzzy.item as CarrierRow).key);
  }
  
  return undefined;
}

function validateCarrierId(id: number): boolean {
  return carrierRows.some(row => Number(row.key) === id);
}

const TRACKER_API_BASE_URL = "https://api.17track.net/track/v2.2";
const USER_AGENT = "MCP-Clipboardy/1.2.0";

interface Props {
  number: string;
  carrier?: number;
}

async function register({ number, carrier }: Props) {
  const body = [
    {
      number,
      carrier: carrier ?? 0,
    },
  ];

  const res = await fetch(`${TRACKER_API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "17token": apiToken,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

async function getDelivery({ number, carrier }: Props) {
  const body = [
    {
      number,
      carrier: carrier ?? 0,
    },
  ];

  const res = await fetch(`${TRACKER_API_BASE_URL}/gettrackinfo`, {
    method: "POST",
    headers: {
      "17token": apiToken,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

const server = new McpServer({
  name: "parcel",
  version: "1.2.0",
  capabilities: {
    resource: {},
    tools: {},
  },
});

server.tool(
  "search-carrier",
  "Search carriers by name keyword (supports fuzzy typos)",
  {
    query: z.string().describe("Keyword to search carrier names, case-insensitive (typos allowed)"),
    limit: z.number().optional().describe("Max number of results to return (default 10)"),
  },
  ({ query, limit = 10 }) => {
    const keyword = query.toLowerCase();
    let exactMatches = carrierRows.filter(
      (row) =>
        row.name_en.toLowerCase().includes(keyword) ||
        row.name_cn.toLowerCase().includes(keyword) ||
        row.name_hk.toLowerCase().includes(keyword)
    );

    if (exactMatches.length === 0) {
      exactMatches = fuse.search(keyword).map((m) => m.item as CarrierRow);
    }

    const results = exactMatches.slice(0, limit).map((row) => ({ id: Number(row.key), name: row.name_en }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        } as const,
      ],
    };
  }
);

server.tool(
  "tracking-delivery",
  "Track a parcel delivery via 17TRACK",
  {
    number: z.string().describe("The tracking number of the parcel"),
    carrier: z
      .number()
      .optional()
      .describe(
        "Carrier ID (number). If omitted, 17TRACK will auto-detect, but accuracy may be lower."
      ),
  },
  async ({ number, carrier }) => {
    if (carrier && !validateCarrierId(carrier)) {
      return {
        content: [
          {
            type: "text",
            text: `The carrier ID "${carrier}" is not valid. Please use the 'search-carrier' tool to find the correct carrier ID.`,
          } as const,
        ],
      };
    }

    if (!carrier) {
      return {
        content: [
          {
            type: "text",
            text:
              "Please specify the carrier ID along with the tracking number for more accurate results. You can use the 'search-carrier' tool to look up the carrier ID first.",
          } as const,
        ],
      };
    }

    try {
      await register({ number, carrier });
      const data = await getDelivery({ number, carrier });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          } as const,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: "Error tracking delivery: " + (error instanceof Error ? error.message : String(error)),
          } as const,
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});