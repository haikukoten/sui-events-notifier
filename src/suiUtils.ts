import { SuiClient, SuiEventFilter, SuiEvent } from '@mysten/sui.js/client';

/**
 * Fetches the event types (structs) defined in a given Sui package.
 * This is a simplified approach. A more robust way would be to parse the package's ABI if available,
 * or look for common event emission patterns.
 * For now, we will fetch recent events and extract unique event types.
 * This is not ideal as it relies on events having been emitted recently.
 * A better way is to use `sui_getNormalizedMoveModule` and parse its structs, 
 * but that requires more complex parsing of the module's ABI.
 */
export async function listPackageEvents(suiClient: SuiClient, packageId: string): Promise<string[]> {
    console.log(`Fetching module details for package: ${packageId}`);
    try {
        const packageObject = await suiClient.getObject({
            id: packageId,
            options: { showContent: true },
        });

        if (!packageObject.data || !packageObject.data.content || packageObject.data.content.dataType !== 'package') {
            throw new Error('Package not found or not a valid package object.');
        }
        
        // The content field for a package contains a map of module names to their disassembled code.
        // We need to iterate through these modules and get their details to find event structs.
        // The type assertion helps TypeScript understand the structure of packageObject.data.content here.
        const content = packageObject.data.content as { dataType: 'package'; disassembled: Record<string, string> };
        const modules = Object.keys(content.disassembled);
        const eventTypes = new Set<string>();

        for (const moduleName of modules) {
            const moduleData = await suiClient.getNormalizedMoveModule({
                package: packageId,
                module: moduleName,
            });

            // Iterate through the structs in the module
            // Events are typically structs that have `has_public_transfer = false` and fields.
            // This is a heuristic and might not capture all event types correctly.
            // Sui events are identified by their type: <package_id>::<module_name>::<struct_name>
            for (const structName in moduleData.structs) {
                const struct = moduleData.structs[structName];
                // A common convention for events is that they are structs.
                // We are looking for fully qualified type names.
                // For simplicity, we list all struct names from the package's modules.
                // The user can then select the correct one.
                // A more advanced version would filter these, e.g. by checking if they have been emitted.
                if (struct.fields.length > 0) { // Events usually have fields
                     eventTypes.add(`${packageId}::${moduleName}::${structName}`);
                }
            }
        }
        
        console.log(`Found event types for package ${packageId}:`, Array.from(eventTypes));
        return Array.from(eventTypes);

    } catch (error) {
        console.error(`Error fetching module details for package ${packageId}:`, error);
        throw error;
    }
}

/**
 * Gets the latest events for a specific event type since a given timestamp.
 * This replaces the subscription approach with a polling approach.
 * 
 * @param suiClient The SuiClient instance.
 * @param eventType The fully qualified name of the event struct.
 * @param sinceTimestampMs Optional timestamp to get events since a certain time (default: 10 minutes ago)
 * @returns Promise<SuiEvent[]> Array of events
 */
export async function getEventsForType(
    suiClient: SuiClient,
    eventType: string,
    sinceTimestampMs?: number
): Promise<SuiEvent[]> {
    console.log(`Fetching events for: ${eventType} since ${sinceTimestampMs ? new Date(sinceTimestampMs).toISOString() : '10 minutes ago'}`);
    
    // If no timestamp provided, default to 10 minutes ago
    const startTime = sinceTimestampMs || Date.now() - 10 * 60 * 1000;
    
    try {
        const eventFilter: SuiEventFilter = {
            MoveEventType: eventType
        };
        
        // Get events using the filter
        const events = await suiClient.queryEvents({
            query: eventFilter,
            // The SDK might provide pagination options, we'll keep it simple for now
            limit: 50, // Limit to latest 50 events
        });
        
        // Filter events to only include those after the given timestamp
        const filteredEvents = events.data.filter((event: SuiEvent) => {
            // Safely handle possibly undefined timestamps
            if (!event.timestampMs) return false;
            return parseInt(event.timestampMs) > startTime;
        });
        
        console.log(`Found ${filteredEvents.length} events for ${eventType} since time filter`);
        return filteredEvents;
    } catch (error) {
        console.error(`Error fetching events for ${eventType}:`, error);
        throw error;
    }
}

/**
 * We'll keep this as a placeholder, but it will immediately throw an error.
 * The frontend will be modified to use polling instead of subscriptions.
 */
export async function subscribeToEvent(
    suiClient: SuiClient,
    packageId: string,
    eventType: string, 
    onEvent: (event: SuiEvent) => void
): Promise<() => Promise<boolean>> {
    throw new Error("Subscription is not supported in this version. Use polling with getEventsForType instead.");
} 