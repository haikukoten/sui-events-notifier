#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Use the correct import syntax with esModuleInterop
const commander_1 = require("commander");
// For CommonJS modules that don't have proper default exports, use this syntax:
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const client_1 = require("@mysten/sui.js/client");
const suiUtils_1 = require("../../src/suiUtils"); // Adjusted to relative path
const uuid_1 = require("uuid"); // For generating subscription IDs
const readline = __importStar(require("readline"));
const program = new commander_1.Command();
// Create a spinner for visual feedback
let spinner;
const subscriptions = new Map();
let activeFilter = null;
/**
 * Initialize a SuiClient with the given RPC URL
 */
function createSuiClient(rpcUrl) {
    console.log(chalk_1.default.blue(`Using Sui RPC URL: ${rpcUrl}`));
    return new client_1.SuiClient({ url: rpcUrl });
}
/**
 * Format and display an event in the terminal
 */
function displayEvent(event, eventType, subscriptionId) {
    const timestamp = new Date(parseInt(event.timestampMs)).toLocaleString();
    const txId = event.id?.txDigest || 'unknown';
    console.log('\n' + chalk_1.default.bgBlue.white(' EVENT ') + ' ' + chalk_1.default.yellow(timestamp));
    console.log(chalk_1.default.green('Type:') + ' ' + eventType);
    console.log(chalk_1.default.green('Subscription:') + ' ' + chalk_1.default.cyan(subscriptionId));
    console.log(chalk_1.default.green('Tx ID:') + ' ' + txId);
    console.log(chalk_1.default.green('Explorer:') + ' ' + chalk_1.default.blue(`https://suiscan.xyz/mainnet/tx/${txId}`));
    console.log(chalk_1.default.green('Data:'));
    console.log(chalk_1.default.cyan(JSON.stringify(event.parsedJson || event, null, 2)));
    console.log(chalk_1.default.gray('─'.repeat(80)));
}
/**
 * List available events for a package
 */
async function listEvents(packageId, rpcUrl) {
    const suiClient = createSuiClient(rpcUrl);
    spinner = (0, ora_1.default)(`Fetching event types for package: ${packageId}`).start();
    try {
        const events = await (0, suiUtils_1.listPackageEvents)(suiClient, packageId);
        spinner.succeed(`Found ${events.length} event types`);
        if (events.length === 0) {
            console.log(chalk_1.default.yellow('No event types found for this package.'));
            return;
        }
        console.log(chalk_1.default.cyan('\nAvailable event types:'));
        events.forEach((event, idx) => {
            console.log(`${chalk_1.default.blue((idx + 1).toString())} ${event}`);
        });
    }
    catch (error) {
        spinner.fail('Failed to fetch event types');
        console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
}
/**
 * Show the list of active subscriptions
 */
function listSubscriptions() {
    console.clear();
    console.log(chalk_1.default.cyan('\n▶ ACTIVE SUBSCRIPTIONS:'));
    console.log(chalk_1.default.gray('─'.repeat(80)));
    if (subscriptions.size === 0) {
        console.log(chalk_1.default.yellow('No active subscriptions.'));
        return;
    }
    subscriptions.forEach((sub, id) => {
        const isActive = activeFilter === id;
        const prefix = isActive ? '➤ ' : '  ';
        const idDisplay = isActive ? `[${id}]` : id;
        console.log(`${prefix}${chalk_1.default.cyan(idDisplay)} - ${sub.eventType} (${sub.eventCount} events)`);
    });
    console.log(chalk_1.default.gray('─'.repeat(80)));
    console.log(`${activeFilter ? chalk_1.default.cyan('Filtered by: ') + activeFilter : chalk_1.default.green('Showing all events')}`);
    console.log(chalk_1.default.gray('─'.repeat(80)));
    console.log(chalk_1.default.yellow('Commands:'));
    console.log(chalk_1.default.yellow('  [f] [id]') + '       - Filter by subscription ID');
    console.log(chalk_1.default.yellow('  [a]') + '            - Show all events (clear filter)');
    console.log(chalk_1.default.yellow('  [l]') + '            - List subscriptions');
    console.log(chalk_1.default.yellow('  [q]') + '            - Quit');
    console.log(chalk_1.default.gray('─'.repeat(80)));
}
/**
 * Set up interactive CLI control for watching events
 */
function setupInteractiveControls() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    // Make stdin emit keypress events
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            // Ctrl+C - quit
            process.exit(0);
        }
        else if (str === 'l') {
            // List subscriptions
            listSubscriptions();
        }
        else if (str === 'a') {
            // Show all events
            activeFilter = null;
            spinner.stop();
            console.clear();
            console.log(chalk_1.default.green('Now showing all events'));
            spinner.start();
        }
        else if (str === 'f') {
            // Filter mode
            spinner.stop();
            rl.question(chalk_1.default.yellow('Enter subscription ID to filter: '), (id) => {
                if (subscriptions.has(id)) {
                    activeFilter = id;
                    console.log(chalk_1.default.green(`Now filtering by subscription: ${id}`));
                }
                else {
                    console.log(chalk_1.default.red(`Subscription ID ${id} not found`));
                }
                spinner.start();
            });
        }
        else if (str === 'q') {
            // Quit
            process.exit(0);
        }
    });
}
/**
 * Watch for events of a specific type
 */
async function watchEvents(packageId, eventType, rpcUrl, interval) {
    const suiClient = createSuiClient(rpcUrl);
    let lastPolled = Date.now();
    let totalEventCount = 0;
    // Convert interval to number if it's a string
    const intervalNum = typeof interval === 'string' ? parseInt(interval, 10) : interval;
    // Create a subscription
    const subscriptionId = (0, uuid_1.v4)().substring(0, 8); // Use first 8 chars for brevity
    subscriptions.set(subscriptionId, {
        id: subscriptionId,
        eventType,
        packageId,
        eventCount: 0,
        events: []
    });
    console.log(chalk_1.default.cyan(`\n▶ Created subscription ${chalk_1.default.green(subscriptionId)} for event type: ${chalk_1.default.yellow(eventType)}`));
    console.log(chalk_1.default.cyan(`▶ Polling every ${intervalNum} seconds...`));
    console.log(chalk_1.default.cyan(`▶ Use keyboard commands: [l] - list subscriptions, [f] - filter by ID, [a] - show all, [q] - quit\n`));
    // Initial spinner
    spinner = (0, ora_1.default)('Waiting for events...').start();
    // Set up interactive controls
    setupInteractiveControls();
    // Set up polling interval
    const intervalId = setInterval(async () => {
        try {
            const events = await (0, suiUtils_1.getEventsForType)(suiClient, eventType, lastPolled);
            if (events.length > 0) {
                // Update last polled time
                lastPolled = Date.now();
                totalEventCount += events.length;
                // Update subscription
                const sub = subscriptions.get(subscriptionId);
                if (sub) {
                    sub.eventCount += events.length;
                    sub.events = [...sub.events, ...events];
                    subscriptions.set(subscriptionId, sub);
                }
                spinner.succeed(`Received ${events.length} new event(s)`);
                // Only display events if not filtered or if matches current filter
                if (activeFilter === null || activeFilter === subscriptionId) {
                    // Display each event
                    events.forEach(event => {
                        displayEvent(event, eventType, subscriptionId);
                    });
                }
                // Reset spinner
                spinner = (0, ora_1.default)(`Waiting for events... (${totalEventCount} received so far)`).start();
            }
            else {
                // Update spinner text to show we're still alive
                spinner.text = `Waiting for events... (${totalEventCount} received so far)`;
            }
        }
        catch (error) {
            spinner.fail('Error fetching events');
            console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
            // Don't exit, keep trying
        }
    }, intervalNum * 1000);
    // Handle graceful exit
    process.on('SIGINT', () => {
        clearInterval(intervalId);
        spinner.stop();
        console.log(chalk_1.default.cyan(`\nStopping event watcher. Received ${totalEventCount} event(s) in total.`));
        process.exit(0);
    });
}
// Configure the CLI
program
    .name('sui-events')
    .description('Sui blockchain event notifier CLI')
    .version('1.0.0');
// List events command
program
    .command('list')
    .description('List available event types for a package')
    .argument('<packageId>', 'The package ID to fetch events from')
    .option('-r, --rpc <url>', 'Sui RPC URL', 'https://sui-rpc.publicnode.com')
    .action(async (packageId, options) => {
    await listEvents(packageId, options.rpc);
});
// Watch events command
program
    .command('watch')
    .description('Watch for events of a specific type')
    .argument('<packageId>', 'The package ID to watch')
    .argument('<eventType>', 'The event type to watch (can be full type or index from list command)')
    .option('-r, --rpc <url>', 'Sui RPC URL', 'https://sui-rpc.publicnode.com')
    .option('-i, --interval <seconds>', 'Polling interval in seconds', '5')
    .action(async (packageId, eventTypeArg, options) => {
    // Check if eventType is a number (index from list)
    if (/^\d+$/.test(eventTypeArg)) {
        // Convert to number and fetch the actual event type
        const index = parseInt(eventTypeArg, 10) - 1;
        spinner = (0, ora_1.default)(`Fetching event types for package: ${packageId}`).start();
        const suiClient = createSuiClient(options.rpc);
        try {
            const events = await (0, suiUtils_1.listPackageEvents)(suiClient, packageId);
            spinner.succeed('Event types fetched');
            if (index < 0 || index >= events.length) {
                console.error(chalk_1.default.red(`Error: Index ${eventTypeArg} is out of range. Available range: 1-${events.length}`));
                process.exit(1);
            }
            const eventType = events[index];
            watchEvents(packageId, eventType, options.rpc, options.interval);
        }
        catch (error) {
            spinner.fail('Failed to fetch event types');
            console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(1);
        }
    }
    else {
        // Direct event type provided
        watchEvents(packageId, eventTypeArg, options.rpc, options.interval);
    }
});
// Watch multiple event types
program
    .command('multi-watch')
    .description('Watch for multiple event types')
    .argument('<packageId>', 'The package ID to watch')
    .option('-r, --rpc <url>', 'Sui RPC URL', 'https://sui-rpc.publicnode.com')
    .option('-i, --interval <seconds>', 'Polling interval in seconds', '5')
    .action(async (packageId, options) => {
    const suiClient = createSuiClient(options.rpc);
    spinner = (0, ora_1.default)(`Fetching event types for package: ${packageId}`).start();
    try {
        const events = await (0, suiUtils_1.listPackageEvents)(suiClient, packageId);
        spinner.succeed(`Found ${events.length} event types`);
        if (events.length === 0) {
            console.log(chalk_1.default.yellow('No event types found for this package.'));
            return;
        }
        console.log(chalk_1.default.cyan('\nAvailable event types:'));
        events.forEach((event, idx) => {
            console.log(`${chalk_1.default.blue((idx + 1).toString())} ${event}`);
        });
        // Create readline interface
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(chalk_1.default.yellow('Enter event numbers to watch (comma separated, e.g., 1,3,5): '), (answer) => {
            rl.close();
            const selectedIndices = answer
                .split(',')
                .map(s => s.trim())
                .filter(s => /^\d+$/.test(s))
                .map(s => parseInt(s, 10) - 1);
            const selectedEvents = selectedIndices
                .filter(idx => idx >= 0 && idx < events.length)
                .map(idx => events[idx]);
            if (selectedEvents.length === 0) {
                console.log(chalk_1.default.red('No valid event types selected. Exiting.'));
                process.exit(1);
            }
            console.log(chalk_1.default.green(`Watching ${selectedEvents.length} event types:`));
            selectedEvents.forEach(event => {
                console.log(`- ${chalk_1.default.cyan(event)}`);
                // Start watching each event type
                watchEvents(packageId, event, options.rpc, options.interval);
            });
        });
    }
    catch (error) {
        spinner.fail('Failed to fetch event types');
        console.error(chalk_1.default.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
});
program.parse(process.argv);
// If no arguments, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
