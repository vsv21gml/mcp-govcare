import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { applyTools } from "chapplin";
import { Hono } from "hono";
import "dotenv/config";
import searchWelfare, { getLastSummary } from "./tools/welfare-search.js";

const mcpPath = process.env.MCP_PATH || '/govcare/mcp'

const app = new Hono();

const mcp = new McpServer({
  name: "welfare-mcp",
  version: "1.0.0",
});

mcp.registerResource(
  "welfare_summary",
  "welfare://summary",
  {},
  async () => ({
    contents: [
      {
        uri: "welfare://summary",
        mimeType: "application/json",
        text: JSON.stringify(
          getLastSummary() ?? { message: "no data yet" },
          null,
          2,
        ),
      },
    ],
  }),
);

applyTools(mcp, [searchWelfare]);

app.all(mcpPath, async (c) => {
  const transport = new StreamableHTTPTransport();
  await mcp.connect(transport);
  return transport.handleRequest(c);
});

serve(app, (info) => {
  console.log(`MCP server listening on ${info.address}:${info.port}${mcpPath}`);
});
