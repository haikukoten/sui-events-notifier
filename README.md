# Sui Event Monitor

A feature-rich application for monitoring events on the Sui blockchain with both a web interface and CLI tool.

## Overview

Sui Event Monitor allows you to:
- Monitor Sui blockchain events in real-time
- Subscribe to specific event types for any package
- Filter and organize events with a tabbed interface
- View detailed event data with transaction links

## Web Interface

![Sui Event Monitor Web UI](https://placeholder.com/sui-event-monitor-screenshot.png)

### Features

- **Real-time Event Monitoring**: Watch Sui blockchain events as they occur
- **Event Type Selection**: Browse available event types for any package ID
- **Tabbable Subscriptions**: Filter events by subscription with one click
- **Transaction Links**: Direct links to SuiScan explorer for each event
- **Modern Cyberpunk UI**: Sleek interface designed for blockchain monitoring

### Cyberpunk UI Features

The application features a distinct cyberpunk aesthetic with:

- **Neon Color Scheme**: Cyan, pink, and yellow accents on dark backgrounds
- **Grid Patterns**: Retro-futuristic background grid patterns
- **Custom Typography**: Orbitron for headings and Rajdhani for body text
- **Glowing Elements**: Neon glow effects on buttons and highlights
- **Panel Layout**: Structured panels with colored side borders
- **Responsive Design**: Adapts to different screen sizes
- **Custom Scrollbars**: Themed scrollbars with gradient styling
- **Interactive Feedback**: Visual feedback for all interactive elements

### Usage

1. Enter a Sui Package ID in the input field
2. Click "FETCH TYPES" to retrieve available event types
3. Select an event type from the dropdown
4. Click "SUBSCRIBE" to start monitoring events
5. Click on a subscription in the list to filter events
6. Click "VIEW ALL EVENTS" to see events from all subscriptions

## CLI Tool

A dedicated command-line tool is also available for those who prefer terminal-based monitoring.

For detailed CLI usage, see the [CLI README](./cli/README.md).

### Basic CLI Commands

```bash
# List event types
sui-events list <packageId>

# Watch specific event type
sui-events watch <packageId> <eventType>

# Monitor multiple event types
sui-events multi-watch <packageId>
```

## Installation

### Web Interface

```bash
# Clone the repository
git clone https://github.com/yourusername/sui-event-monitor.git
cd sui-event-monitor

# Install dependencies
npm install

# Start the server
npm start
```

The web interface will be available at http://localhost:3000.

### CLI Tool

```bash
# Install globally
cd cli
npm install -g .

# Or use directly from the project
cd cli
npm install
npm run build
node dist/cli.js <command>
```

## Technologies

- **Frontend**: HTML, CSS, JavaScript with modern ES6+ features
- **Backend**: Node.js with Express
- **Blockchain**: Sui SDK for JavaScript
- **CLI**: Commander.js, Chalk, Ora
- **Real-time Updates**: Custom implementation with polling

## License

MIT 