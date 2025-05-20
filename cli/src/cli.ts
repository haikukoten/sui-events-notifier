#!/usr/bin/env node

// Use the correct import syntax with esModuleInterop
import { Command } from 'commander';
// For CommonJS modules that don't have proper default exports, use this syntax:
import chalk from 'chalk';
import ora from 'ora';
import { SuiClient } from '@mysten/sui.js/client';
import { listPackageEvents, getEventsForType } from '../../src/suiUtils'; // Adjusted to relative path
import { v4 as uuidv4 } from 'uuid'; // For generating subscription IDs
import * as readline from 'readline';

// Define the option types for better type safety
interface ListCommandOptions {
  rpc: string;
}

interface WatchCommandOptions {
  rpc: string;
  interval: string;
}

const program = new Command();

// Create a spinner for visual feedback
let spinner: ReturnType<typeof ora>;

// Store active subscriptions
type Subscription = {
  id: string;
  eventType: string;
  packageId: string;
  eventCount: number;
  events: any[];
};

const subscriptions = new Map<string, Subscription>();
let activeFilter: string | null = null;

/**
 * Initialize a SuiClient with the given RPC URL
 */
function createSuiClient(rpcUrl: string): SuiClient {
  console.log(chalk.blue(`Using Sui RPC URL: ${rpcUrl}`));
  return new SuiClient({ url: rpcUrl });
}

/**
 * Format and display an event in the terminal
 */
function displayEvent(event: any, eventType: string, subscriptionId: string): void {
  const timestamp = new Date(parseInt(event.timestampMs)).toLocaleString();
  const txId = event.id?.txDigest || 'unknown';
  
  console.log('\n' + chalk.bgBlue.white(' EVENT ') + ' ' + chalk.yellow(timestamp));
  console.log(chalk.green('Type:') + ' ' + eventType);
  console.log(chalk.green('Subscription:') + ' ' + chalk.cyan(subscriptionId));
  console.log(chalk.green('Tx ID:') + ' ' + txId);
  console.log(chalk.green('Explorer:') + ' ' + chalk.blue(`https://suiscan.xyz/mainnet/tx/${txId}`));
  console.log(chalk.green('Data:'));
  console.log(chalk.cyan(JSON.stringify(event.parsedJson || event, null, 2)));
  console.log(chalk.gray('─'.repeat(80)));
}

/**
 * List available events for a package
 */
async function listEvents(packageId: string, rpcUrl: string): Promise<void> {
  const suiClient = createSuiClient(rpcUrl);
  
  spinner = ora(`Fetching event types for package: ${packageId}`).start();
  
  try {
    const events = await listPackageEvents(suiClient, packageId);
    spinner.succeed(`Found ${events.length} event types`);
    
    if (events.length === 0) {
      console.log(chalk.yellow('No event types found for this package.'));
      return;
    }
    
    console.log(chalk.cyan('\nAvailable event types:'));
    events.forEach((event, idx) => {
      console.log(`${chalk.blue((idx + 1).toString())} ${event}`);
    });
    
  } catch (error) {
    spinner.fail('Failed to fetch event types');
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

/**
 * Show the list of active subscriptions
 */
function listSubscriptions(): void {
  console.clear();
  console.log(chalk.cyan('\n▶ ACTIVE SUBSCRIPTIONS:'));
  console.log(chalk.gray('─'.repeat(80)));
  
  if (subscriptions.size === 0) {
    console.log(chalk.yellow('No active subscriptions.'));
    return;
  }
  
  subscriptions.forEach((sub, id) => {
    const isActive = activeFilter === id;
    const prefix = isActive ? '➤ ' : '  ';
    const idDisplay = isActive ? `[${id}]` : id;
    
    console.log(`${prefix}${chalk.cyan(idDisplay)} - ${sub.eventType} (${sub.eventCount} events)`);
  });
  
  console.log(chalk.gray('─'.repeat(80)));
  console.log(`${activeFilter ? chalk.cyan('Filtered by: ') + activeFilter : chalk.green('Showing all events')}`);
  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.yellow('Commands:'));
  console.log(chalk.yellow('  [f] [id]') + '       - Filter by subscription ID');
  console.log(chalk.yellow('  [a]') + '            - Show all events (clear filter)');
  console.log(chalk.yellow('  [l]') + '            - List subscriptions');
  console.log(chalk.yellow('  [q]') + '            - Quit');
  console.log(chalk.gray('─'.repeat(80)));
}

/**
 * Set up interactive CLI control for watching events
 */
function setupInteractiveControls(): void {
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
    } else if (str === 'l') {
      // List subscriptions
      listSubscriptions();
    } else if (str === 'a') {
      // Show all events
      activeFilter = null;
      spinner.stop();
      console.clear();
      console.log(chalk.green('Now showing all events'));
      spinner.start();
    } else if (str === 'f') {
      // Filter mode
      spinner.stop();
      rl.question(chalk.yellow('Enter subscription ID to filter: '), (id) => {
        if (subscriptions.has(id)) {
          activeFilter = id;
          console.log(chalk.green(`Now filtering by subscription: ${id}`));
        } else {
          console.log(chalk.red(`Subscription ID ${id} not found`));
        }
        spinner.start();
      });
    } else if (str === 'q') {
      // Quit
      process.exit(0);
    }
  });
}

/**
 * Watch for events of a specific type
 */
async function watchEvents(packageId: string, eventType: string, rpcUrl: string, interval: string | number): Promise<void> {
  const suiClient = createSuiClient(rpcUrl);
  let lastPolled = Date.now();
  let totalEventCount = 0;
  
  // Convert interval to number if it's a string
  const intervalNum = typeof interval === 'string' ? parseInt(interval, 10) : interval;
  
  // Create a subscription
  const subscriptionId = uuidv4().substring(0, 8); // Use first 8 chars for brevity
  subscriptions.set(subscriptionId, {
    id: subscriptionId,
    eventType,
    packageId,
    eventCount: 0,
    events: []
  });
  
  console.log(chalk.cyan(`\n▶ Created subscription ${chalk.green(subscriptionId)} for event type: ${chalk.yellow(eventType)}`));
  console.log(chalk.cyan(`▶ Polling every ${intervalNum} seconds...`));
  console.log(chalk.cyan(`▶ Use keyboard commands: [l] - list subscriptions, [f] - filter by ID, [a] - show all, [q] - quit\n`));
  
  // Initial spinner
  spinner = ora('Waiting for events...').start();
  
  // Set up interactive controls
  setupInteractiveControls();
  
  // Set up polling interval
  const intervalId = setInterval(async () => {
    try {
      const events = await getEventsForType(suiClient, eventType, lastPolled);
      
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
        spinner = ora(`Waiting for events... (${totalEventCount} received so far)`).start();
      } else {
        // Update spinner text to show we're still alive
        spinner.text = `Waiting for events... (${totalEventCount} received so far)`;
      }
    } catch (error) {
      spinner.fail('Error fetching events');
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      // Don't exit, keep trying
    }
  }, intervalNum * 1000);
  
  // Handle graceful exit
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    spinner.stop();
    console.log(chalk.cyan(`\nStopping event watcher. Received ${totalEventCount} event(s) in total.`));
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
  .action(async (packageId: string, options: ListCommandOptions) => {
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
  .action(async (packageId: string, eventTypeArg: string, options: WatchCommandOptions) => {
    // Check if eventType is a number (index from list)
    if (/^\d+$/.test(eventTypeArg)) {
      // Convert to number and fetch the actual event type
      const index = parseInt(eventTypeArg, 10) - 1;
      
      spinner = ora(`Fetching event types for package: ${packageId}`).start();
      const suiClient = createSuiClient(options.rpc);
      
      try {
        const events = await listPackageEvents(suiClient, packageId);
        spinner.succeed('Event types fetched');
        
        if (index < 0 || index >= events.length) {
          console.error(chalk.red(`Error: Index ${eventTypeArg} is out of range. Available range: 1-${events.length}`));
          process.exit(1);
        }
        
        const eventType = events[index];
        watchEvents(packageId, eventType, options.rpc, options.interval);
      } catch (error) {
        spinner.fail('Failed to fetch event types');
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
      
    } else {
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
  .action(async (packageId: string, options: WatchCommandOptions) => {
    const suiClient = createSuiClient(options.rpc);
    
    spinner = ora(`Fetching event types for package: ${packageId}`).start();
    
    try {
      const events = await listPackageEvents(suiClient, packageId);
      spinner.succeed(`Found ${events.length} event types`);
      
      if (events.length === 0) {
        console.log(chalk.yellow('No event types found for this package.'));
        return;
      }
      
      console.log(chalk.cyan('\nAvailable event types:'));
      events.forEach((event, idx) => {
        console.log(`${chalk.blue((idx + 1).toString())} ${event}`);
      });
      
      // Create readline interface
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      rl.question(chalk.yellow('Enter event numbers to watch (comma separated, e.g., 1,3,5): '), (answer) => {
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
          console.log(chalk.red('No valid event types selected. Exiting.'));
          process.exit(1);
        }
        
        console.log(chalk.green(`Watching ${selectedEvents.length} event types:`));
        selectedEvents.forEach(event => {
          console.log(`- ${chalk.cyan(event)}`);
          // Start watching each event type
          watchEvents(packageId, event, options.rpc, options.interval);
        });
      });
      
    } catch (error) {
      spinner.fail('Failed to fetch event types');
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 