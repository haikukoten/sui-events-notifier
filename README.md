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

# Build the application for production
npm run build

# Start the production server
npm start
```

The web interface will be available at http://localhost:3002.

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

## Hosting the Web Application

To host the Sui Event Monitor web application, you'll need a server environment with Node.js installed. Here's a general outline:

1.  **Build the Application**: On your server, or as part of a deployment pipeline, build the application:
    ```bash
    git clone https://github.com/yourusername/sui-event-monitor.git
    cd sui-event-monitor
    npm install
    npm run build
    ```

2.  **Run the Application**: Start the application using the production start script:
    ```bash
    npm start
    ```
    This will run the server using the compiled JavaScript in the `dist` folder.

3.  **Process Manager (Recommended)**: For long-running applications in production, it's highly recommended to use a process manager like PM2. PM2 can automatically restart your application if it crashes, manage logs, and handle other production concerns.
    *   Install PM2 globally (if not already installed):
        ```bash
        npm install pm2 -g
        ```
    *   Start your application with PM2:
        ```bash
        pm2 start npm --name "sui-event-monitor" -- run start
        ```
    *   To view logs: `pm2 logs sui-event-monitor`
    *   To monitor: `pm2 monit`

4.  **Web Server / Reverse Proxy (Optional but Recommended)**: For a production deployment, you typically run your Node.js application behind a web server like Nginx or Apache. This web server can handle tasks like:
    *   SSL termination (HTTPS)
    *   Serving static assets (though `express.static` also works)
    *   Load balancing (if you scale to multiple instances)
    *   Caching

    An example Nginx configuration might look something like this (this is a basic example and would need to be adapted to your server setup and domain):

    ```nginx
    server {
        listen 80;
        server_name yourappdomain.com;

        location / {
            proxy_pass http://localhost:3002; # Assuming your Node app runs on port 3002
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

5.  **Environment Variables**: If you have any configuration that might change between environments (e.g., API keys, RPC URLs if they weren't hardcoded), use environment variables. You can use a `.env` file with a library like `dotenv` during development, and set actual environment variables in your production environment.

6.  **Firewall**: Ensure your server's firewall is configured to allow traffic on the port your application (or reverse proxy) is listening on (e.g., port 80 for HTTP, port 443 for HTTPS).

These are general steps. The exact deployment process will vary depending on your chosen hosting provider (e.g., AWS, Google Cloud, DigitalOcean, Heroku, Vercel, etc.). Many providers offer specific Node.js deployment guides and tools.

## Technologies

- **Frontend**: HTML, CSS, JavaScript with modern ES6+ features
- **Backend**: Node.js with Express
- **Blockchain**: Sui SDK for JavaScript
- **CLI**: Commander.js, Chalk, Ora
- **Real-time Updates**: Custom implementation with polling

## License

MIT 