# Parcel Tracking MCP Server

A Model Context Protocol (MCP) server for tracking parcel deliveries using the 17track.net API.

<a href="https://glama.ai/mcp/servers/@iamfiro/parcel-tracking-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@iamfiro/parcel-tracking-mcp/badge" alt="Parcel Tracking Server MCP server" />
</a>

## Features

- Track parcel deliveries from various carriers
- Automatic carrier detection
- Support for manual carrier specification
- Built with TypeScript and MCP SDK

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- 17track.net API token

## Installation

Install the package via npm:

```bash
npm install -g parcel-tracking-mcp-server
```

Or install locally:

```bash
npm install parcel-tracking-mcp-server
```

## Configuration

Create a `config.json` file in your working directory with your 17track.net API token:

```json
{
  "apiToken": "your-17track-api-token-here"
}
```

**Note:** The server looks for `config.json` in the current working directory where you run the command.

### Getting a 17track.net API Token

1. Visit [17track.net](https://17track.net)
2. Sign up for an account
3. Navigate to the API section
4. Generate your API token
5. Add it to your `config.json` file

## Usage

### Running the Server

If installed globally:
```bash
parcel-tracking-mcp-server
```

If installed locally:
```bash
npx parcel-tracking-mcp-server
```

Or if you're using it as a dependency in your project:
```bash
node node_modules/parcel-tracking-mcp-server/dist/index.js
```

## MCP Client Configuration

To use this server with MCP clients (like Claude Desktop), add it to your MCP configuration:

```json
{
  "mcpServers": {
    "parcel-tracking": {
      "command": "npx",
      "args": ["parcel-tracking-mcp-server"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "parcel-tracking": {
      "command": "parcel-tracking-mcp-server"
    }
  }
}
```

### Available Tools

#### `tracking-delivery`

Track a parcel delivery by providing a tracking number.

**Parameters:**
- `number` (required): The tracking number of the parcel
- `carrier` (optional): The carrier of the parcel (defaults to 'auto' for automatic detection)

**Example:**
```typescript
// Track with automatic carrier detection
await trackingDelivery({
  number: "1234567890"
});

// Track with specific carrier
await trackingDelivery({
  number: "1234567890",
  carrier: "ups"
});
```

### Supported Carriers

The server supports automatic carrier detection, but you can also specify carriers manually. Common carriers include:
- UPS
- FedEx
- DHL
- USPS
- China Post
- And many more (check 17track.net documentation for full list)

## API Response Format

The server returns tracking information in JSON format, including:
- Tracking status
- Delivery progress
- Timestamps
- Location updates
- Carrier information

## Error Handling

The server includes comprehensive error handling:
- API connection errors
- Invalid tracking numbers
- Missing configuration
- Network timeouts

## Development

### Project Structure

```
├── index.ts          # Main server implementation
├── config.json       # Configuration file (create this)
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

### Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for building servers
- `zod` - Schema validation
- `node-fetch` - HTTP requests (if needed for older Node.js versions)

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues related to:
- MCP protocol: Check the [MCP documentation](https://modelcontextprotocol.io)
- 17track.net API: Visit [17track.net API docs](https://api.17track.net)
- This implementation: Create an issue in the repository

## Changelog

### v1.0.0
- Initial release
- Basic parcel tracking functionality
- Support for automatic and manual carrier detection
- Error handling and logging