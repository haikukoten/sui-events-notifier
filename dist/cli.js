#!/usr/bin/env node
"use strict";
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
const suiUtils_1 = require("./suiUtils");
const program = new commander_1.Command();
// Create a spinner for visual feedback
let spinner;
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
function displayEvent(event, eventType) {
    const timestamp = new Date(parseInt(event.timestampMs)).toLocaleString();
    const txId = event.id?.txDigest || 'unknown';
    console.log('\n' + chalk_1.default.bgBlue.white(' EVENT ') + ' ' + chalk_1.default.yellow(timestamp));
    console.log(chalk_1.default.green('Type:') + ' ' + eventType);
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
 * Watch for events of a specific type
 */
async function watchEvents(packageId, eventType, rpcUrl, interval) {
    const suiClient = createSuiClient(rpcUrl);
    let lastPolled = Date.now();
    let eventCount = 0;
    // Convert interval to number if it's a string
    const intervalNum = typeof interval === 'string' ? parseInt(interval, 10) : interval;
    console.log(chalk_1.default.cyan(`\nWatching for events: ${chalk_1.default.yellow(eventType)}`));
    console.log(chalk_1.default.cyan(`Polling every ${intervalNum} seconds...`));
    console.log(chalk_1.default.cyan(`Press ${chalk_1.default.bold('Ctrl+C')} to stop watching.\n`));
    // Initial spinner
    spinner = (0, ora_1.default)('Waiting for events...').start();
    // Set up polling interval
    const intervalId = setInterval(async () => {
        try {
            const events = await (0, suiUtils_1.getEventsForType)(suiClient, eventType, lastPolled);
            if (events.length > 0) {
                spinner.succeed(`Received ${events.length} new event(s)`);
                lastPolled = Date.now();
                eventCount += events.length;
                // Display each event
                events.forEach(event => {
                    displayEvent(event, eventType);
                });
                // Reset spinner
                spinner = (0, ora_1.default)(`Waiting for events... (${eventCount} received so far)`).start();
            }
            else {
                // Update spinner text to show we're still alive
                spinner.text = `Waiting for events... (${eventCount} received so far)`;
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
        console.log(chalk_1.default.cyan(`\nStopping event watcher. Received ${eventCount} event(s) in total.`));
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
program.parse(process.argv);
// If no arguments, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
