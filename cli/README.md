# Sui Event Monitor CLI

A powerful command-line interface for monitoring Sui blockchain events with rich features and interactive controls.

![Sui Event Monitor CLI](https://placeholder.com/sui-event-cli-screenshot.png)

## Features

- **Event Type Discovery**: List all event types for any Sui package
- **Real-time Event Monitoring**: Watch events as they occur on the Sui blockchain
- **Multi-subscription Support**: Monitor multiple event types simultaneously
- **Interactive Controls**: Filter and manage subscriptions without restarting
- **Rich Terminal UI**: Color-coded output with spinner animations
- **Transaction Links**: Direct links to SuiScan explorer for each event
- **Customizable Polling**: Adjust the polling interval to your needs

## Installation

### Global Installation (recommended)

```bash
# From npm (if published)
npm install -g sui-event-monitor-cli

# OR from this repository
cd cli
npm install -g .
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sui-event-monitor.git
cd sui-event-monitor/cli

# Install dependencies
npm install

# Build the CLI
npm run build
```

## Usage

### List Event Types

List all available event types for a specific package:

```bash
sui-events list <packageId> [options]
```

Options:
- `-r, --rpc <url>` - Custom Sui RPC URL (default: https://sui-rpc.publicnode.com)

Example:
```bash
sui-events list 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb
```

### Watch Events

Watch for events of a specific type:

```bash
sui-events watch <packageId> <eventType> [options]
```

You can specify the event type in two ways:
1. Use the full event type, e.g., `0xpackage::module::EventName`
2. Use the index from the list command, e.g., `1` for the first event type

Options:
- `-r, --rpc <url>` - Custom Sui RPC URL (default: https://sui-rpc.publicnode.com)
- `-i, --interval <seconds>` - Polling interval in seconds (default: 5)

Examples:
```bash
# Using full event type
sui-events watch 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::SwapEvent

# Using index from list command
sui-events watch 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb 1

# With custom polling interval (2 seconds)
sui-events watch 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb 1 -i 2

# With custom RPC endpoint
sui-events watch 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb 1 -r https://rpc.mysten.io
```

### Monitor Multiple Event Types

Watch multiple event types at once with the multi-watch command:

```bash
sui-events multi-watch <packageId> [options]
```

Options:
- `-r, --rpc <url>` - Custom Sui RPC URL (default: https://sui-rpc.publicnode.com)
- `-i, --interval <seconds>` - Polling interval in seconds (default: 5)

This command will:
1. List all available event types for the package
2. Prompt you to select which event types to monitor
3. Start monitoring all selected event types simultaneously

Example:
```bash
sui-events multi-watch 0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb
```

## Interactive Controls

While monitoring events, you can use these keyboard controls:

- `l` - List all active subscriptions
- `f` - Filter events by subscription ID
- `a` - Show all events (clear filter)
- `q` - Quit the application
- `Ctrl+C` - Quit the application

## Output Format

Event data is displayed in a structured format:

```
┌─────────────────────────────────────────────────────────┐
│ EVENT  2023-04-25 14:32:45                             │
├─────────────────────────────────────────────────────────┤
│ Type: 0xpackage::module::EventName                     │
│ Subscription: abc123                                   │
│ Tx ID: 5Gv4dC...8fZq                                   │
│ Explorer: https://suiscan.xyz/mainnet/tx/5Gv4dC...8fZq │
├─────────────────────────────────────────────────────────┤
│ Data:                                                  │
│ {                                                      │
│   "field1": "value1",                                  │
│   "field2": 123,                                       │
│   "nested": {                                          │
│     "subfield": "value"                                │
│   }                                                    │
│ }                                                      │
└─────────────────────────────────────────────────────────┘
```

## Development

### Project Structure

- `src/cli.ts` - Main CLI application
- `src/commands/` - Command handlers
- `src/utils/` - Utility functions

### Building

```bash
npm run build
```

### Running from Source

```bash
# Using ts-node
npx ts-node src/cli.ts [command]

# Or after building
node dist/cli.js [command]
```

## License

MIT 