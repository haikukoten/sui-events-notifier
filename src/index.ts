import express, { Request, Response } from 'express';
import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import { SuiClient, SuiEvent } from '@mysten/sui.js/client';
import { listPackageEvents, getEventsForType } from './suiUtils';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3002;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Sui Client setup - simple HTTP-only client
const SUI_RPC_URL = 'https://sui-rpc.publicnode.com';
console.log(`Using Sui RPC URL: ${SUI_RPC_URL}`);
const suiClient = new SuiClient({ url: SUI_RPC_URL });

// Track active subscriptions in memory
const activeSubscriptions = new Map();

// API endpoint to get event types for a package
app.get('/api/package-events/:packageId', async (req: Request, res: Response) => {
    const { packageId } = req.params;
    if (!packageId) {
        return res.status(400).json({ error: 'Package ID is required' });
    }
    try {
        const events = await listPackageEvents(suiClient, packageId);
        res.json(events);
    } catch (error) {
        console.error(`Error fetching events for package ${packageId}:`, error);
        // @ts-ignore
        res.status(500).json({ error: error.message || 'Failed to fetch package events' });
    }
});

// API endpoint to get events for a specific type (used for polling)
app.get('/api/events/:eventType', async (req: Request, res: Response) => {
    const { eventType } = req.params;
    const sinceTimestamp = req.query.since ? parseInt(req.query.since as string) : undefined;
    
    if (!eventType) {
        return res.status(400).json({ error: 'Event type is required' });
    }
    
    try {
        const events = await getEventsForType(suiClient, eventType, sinceTimestamp);
        res.json(events);
    } catch (error) {
        console.error(`Error fetching events for type ${eventType}:`, error);
        // @ts-ignore
        res.status(500).json({ error: error.message || 'Failed to fetch events' });
    }
});

// WebSocket connection handling (now for UI updates only, not Sui event subscription)
wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    
    // @ts-ignore (we're adding a dynamic property to track client subscriptions)
    ws.clientSubscriptions = new Map();
    
    // Set up polling intervals for subscribed events
    // @ts-ignore
    ws.pollingIntervals = new Map();

    ws.on('message', async (message: WebSocket.RawData) => {
        try {
            const parsedMessage = JSON.parse(message.toString());
            console.log('Received message from client:', parsedMessage);

            if (parsedMessage.type === 'subscribe') {
                const { packageId, eventType, subscriptionId } = parsedMessage.payload;
                if (!packageId || !eventType || !subscriptionId) {
                    ws.send(JSON.stringify({ type: 'error', payload: 'Missing packageId, eventType, or subscriptionId for subscription', subscriptionId }));
                    return;
                }

                console.log(`Client wants to subscribe to ${eventType} from package ${packageId}`);
                
                // @ts-ignore (checking if this client already has this subscription)
                if (ws.clientSubscriptions.has(subscriptionId)) {
                    ws.send(JSON.stringify({ type: 'error', payload: 'Already subscribed with this ID.', subscriptionId }));
                    return;
                }

                try {
                    // Get current timestamp to track events from now on
                    const startTimestamp = Date.now();
                    
                    // Store subscription details
                    // @ts-ignore
                    ws.clientSubscriptions.set(subscriptionId, { 
                        packageId, 
                        eventType, 
                        lastPolled: startTimestamp 
                    });
                    
                    // Set up polling interval (every 10 seconds)
                    // @ts-ignore
                    const intervalId = setInterval(async () => {
                        try {
                            // @ts-ignore
                            const subscription = ws.clientSubscriptions.get(subscriptionId);
                            if (!subscription) return; // Subscription was removed
                            
                            const events = await getEventsForType(
                                suiClient, 
                                eventType, 
                                subscription.lastPolled
                            );
                            
                            // Update last polled timestamp
                            subscription.lastPolled = Date.now();
                            
                            // Send events to client
                            if (events.length > 0) {
                                events.forEach(event => {
                                    ws.send(JSON.stringify({ 
                                        type: 'event', 
                                        payload: event, 
                                        subscriptionId 
                                    }));
                                });
                            }
                        } catch (error) {
                            console.error(`Error polling events for ${subscriptionId}:`, error);
                        }
                    }, 10000); // Poll every 10 seconds
                    
                    // @ts-ignore
                    ws.pollingIntervals.set(subscriptionId, intervalId);
                    
                    // Send subscription confirmation
                    ws.send(JSON.stringify({ 
                        type: 'subscribed', 
                        payload: { packageId, eventType }, 
                        subscriptionId 
                    }));
                    
                    console.log(`Client subscribed to ${eventType} with polling (ID: ${subscriptionId})`);
                } catch (error) {
                    console.error(`Error setting up polling for ${eventType}:`, error);
                    // @ts-ignore
                    ws.send(JSON.stringify({ type: 'error', payload: error.message || 'Failed to set up polling', subscriptionId }));
                }

            } else if (parsedMessage.type === 'unsubscribe') {
                const { subscriptionId } = parsedMessage.payload;
                // @ts-ignore
                if (ws.clientSubscriptions && ws.clientSubscriptions.has(subscriptionId)) {
                    // Clear the polling interval
                    // @ts-ignore
                    const intervalId = ws.pollingIntervals.get(subscriptionId);
                    if (intervalId) {
                        clearInterval(intervalId);
                        // @ts-ignore
                        ws.pollingIntervals.delete(subscriptionId);
                    }
                    
                    // Remove the subscription
                    // @ts-ignore
                    ws.clientSubscriptions.delete(subscriptionId);
                    
                    ws.send(JSON.stringify({ type: 'unsubscribed', payload: { subscriptionId } }));
                    console.log(`Client unsubscribed from ${subscriptionId}`);
                } else {
                    ws.send(JSON.stringify({ type: 'error', payload: 'Subscription ID not found for unsubscribe.', subscriptionId }));
                }
            } else if (parsedMessage.type === 'poll_now') {
                // Immediate poll request
                const { subscriptionId } = parsedMessage.payload;
                // @ts-ignore
                if (ws.clientSubscriptions && ws.clientSubscriptions.has(subscriptionId)) {
                    // @ts-ignore
                    const subscription = ws.clientSubscriptions.get(subscriptionId);
                    
                    try {
                        const events = await getEventsForType(
                            suiClient, 
                            subscription.eventType, 
                            subscription.lastPolled
                        );
                        
                        // Update last polled timestamp
                        subscription.lastPolled = Date.now();
                        
                        // Send events to client
                        if (events.length > 0) {
                            events.forEach(event => {
                                ws.send(JSON.stringify({ 
                                    type: 'event', 
                                    payload: event, 
                                    subscriptionId 
                                }));
                            });
                        }
                        
                        ws.send(JSON.stringify({ 
                            type: 'poll_complete', 
                            payload: { count: events.length }, 
                            subscriptionId 
                        }));
                    } catch (error) {
                        console.error(`Error polling events for ${subscriptionId}:`, error);
                        // @ts-ignore
                        ws.send(JSON.stringify({ type: 'error', payload: error.message || 'Failed to poll events', subscriptionId }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', payload: 'Subscription ID not found for polling.', subscriptionId }));
                }
            }

        } catch (error) {
            console.error('Failed to process message:', error);
            // @ts-ignore
            ws.send(JSON.stringify({ type: 'error', payload: error.message || 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Clean up intervals
        // @ts-ignore
        if (ws.pollingIntervals) {
            // @ts-ignore
            ws.pollingIntervals.forEach((intervalId) => {
                clearInterval(intervalId);
            });
            // @ts-ignore
            ws.pollingIntervals.clear();
        }
        
        // @ts-ignore
        if (ws.clientSubscriptions) {
            // @ts-ignore
            ws.clientSubscriptions.clear();
        }
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        // Clean up intervals here too
        // @ts-ignore
        if (ws.pollingIntervals) {
            // @ts-ignore
            ws.pollingIntervals.forEach((intervalId) => {
                clearInterval(intervalId);
            });
            // @ts-ignore
            ws.pollingIntervals.clear();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Access the UI at http://localhost:${PORT}`);
});

export default app; 