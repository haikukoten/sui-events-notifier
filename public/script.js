document.addEventListener('DOMContentLoaded', () => {
    const packageIdInput = document.getElementById('packageIdInput');
    const fetchEventsButton = document.getElementById('fetchEventsButton');
    const loadingMessage = document.getElementById('loadingMessage');
    const eventListSection = document.getElementById('event-list-section');
    const displayedPackageId = document.getElementById('displayedPackageId');
    const eventTypeDropdown = document.getElementById('eventTypeDropdown');
    const subscribeButton = document.getElementById('subscribeButton');
    const activeSubscriptionsDiv = document.getElementById('activeSubscriptions');
    const eventFeedList = document.getElementById('eventFeedList');
    const eventFeedContainer = document.getElementById('eventFeed');

    let currentPackageId = null;
    // Generates a unique ID for each subscription attempt by the client
    let nextSubscriptionDisplayId = 1; 
    // Maps client-side subscription display ID to the actual event type string for easy management
    const activeClientSubscriptions = new Map(); 
    // To store all received events
    const allEvents = new Map();
    // Current active filter for events
    let activeFilter = null;

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    // Fix title element to not include HTML tags
    document.title = "Sui Event Monitor";

    socket.onopen = () => {
        console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Message from server: ', message);

        switch (message.type) {
            case 'event':
                storeAndAppendEvent(message.subscriptionId, message.payload);
                break;
            case 'subscribed':
                console.log('Successfully subscribed to:', message.payload);
                updateSubscriptionDisplay(message.subscriptionId, message.payload.eventType, true);
                break;
            case 'unsubscribed':
                console.log('Successfully unsubscribed from:', message.payload.subscriptionId);
                updateSubscriptionDisplay(message.payload.subscriptionId, null, false);
                break;
            case 'error':
                console.error('Server error:', message.payload);
                alert(`Error: ${message.payload}${message.subscriptionId ? ' (ID: ' + message.subscriptionId + ')' : ''}`);
                subscribeButton.disabled = false;
                subscribeButton.innerHTML = '<i class="fas fa-satellite-dish"></i>';
                break;
        }
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
        appendMessageToFeed('Connection to server lost. Please refresh.');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        appendMessageToFeed('WebSocket error. See console for details.');
    };

    fetchEventsButton.addEventListener('click', async () => {
        currentPackageId = packageIdInput.value.trim();
        if (!currentPackageId) {
            alert('Please enter a Package ID.');
            return;
        }

        eventTypeDropdown.innerHTML = ''; // Clear previous dropdown options
        eventListSection.style.display = 'none';
        loadingMessage.style.display = 'block';
        displayedPackageId.textContent = currentPackageId;

        try {
            const response = await fetch(`/api/package-events/${currentPackageId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const eventTypes = await response.json();

            if (eventTypes.length === 0) {
                const option = document.createElement('option');
                option.textContent = 'No event types found';
                option.disabled = true;
                eventTypeDropdown.appendChild(option);
                subscribeButton.disabled = true;
            } else {
                // Add default prompt option
                const defaultOption = document.createElement('option');
                defaultOption.textContent = 'Select an event type...';
                defaultOption.value = '';
                defaultOption.selected = true;
                defaultOption.disabled = true;
                eventTypeDropdown.appendChild(defaultOption);

                // Add actual event type options
                eventTypes.forEach(eventType => {
                    const option = document.createElement('option');
                    option.textContent = eventType;
                    option.value = eventType;
                    
                    // Check if already subscribed
                    let isSubscribed = false;
                    for (const [id, sub] of activeClientSubscriptions.entries()) {
                        if (sub.eventType === eventType && sub.packageId === currentPackageId) {
                            isSubscribed = true;
                            option.disabled = true;
                            option.textContent = `${eventType} (SUBSCRIBED)`;
                            break;
                        }
                    }
                    
                    eventTypeDropdown.appendChild(option);
                });
                
                subscribeButton.disabled = false;
            }
            eventListSection.style.display = 'block';
        } catch (error) {
            console.error('Error fetching event types:', error);
            const option = document.createElement('option');
            option.textContent = `Error: ${error.message}`;
            option.disabled = true;
            eventTypeDropdown.appendChild(option);
            eventListSection.style.display = 'block';
            subscribeButton.disabled = true;
        } finally {
            loadingMessage.style.display = 'none';
        }
    });

    subscribeButton.addEventListener('click', () => {
        const selectedEventType = eventTypeDropdown.value;
        
        if (!selectedEventType) {
            alert('Please select an event type first.');
            return;
        }
        
        // Check if already subscribed to this event type
        for (const [id, sub] of activeClientSubscriptions.entries()) {
            if (sub.eventType === selectedEventType && sub.packageId === currentPackageId) {
                alert('You are already subscribed to this event type.');
                return;
            }
        }
        
        const newSubscriptionId = 'sub_' + nextSubscriptionDisplayId++;
        
        console.log(`Attempting to subscribe to ${currentPackageId} - ${selectedEventType} with ID ${newSubscriptionId}`);
        socket.send(JSON.stringify({ 
            type: 'subscribe', 
            payload: { packageId: currentPackageId, eventType: selectedEventType, subscriptionId: newSubscriptionId }
        }));
        
        subscribeButton.disabled = true;
        subscribeButton.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        
        // Store subscription info
        activeClientSubscriptions.set(newSubscriptionId, { 
            packageId: currentPackageId, 
            eventType: selectedEventType,
            dropdown: eventTypeDropdown
        });
        
        // Create event collection for this subscription
        allEvents.set(newSubscriptionId, []);
    });
    
    function updateSubscriptionDisplay(subscriptionId, eventType, isSubscribed) {
        const subInfo = activeClientSubscriptions.get(subscriptionId);
        
        if (isSubscribed) {
            if (subInfo) {
                // Find and disable the option in the dropdown
                if (subInfo.dropdown) {
                    const options = subInfo.dropdown.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === subInfo.eventType) {
                            options[i].disabled = true;
                            options[i].textContent = `${subInfo.eventType} (SUBSCRIBED)`;
                            break;
                        }
                    }
                }
                
                // Reset subscribe button
                subscribeButton.disabled = false;
                subscribeButton.innerHTML = '<i class="fas fa-satellite-dish"></i>';
                
                // Update subscription info
                activeClientSubscriptions.set(subscriptionId, { 
                    ...subInfo, 
                    packageId: currentPackageId, 
                    eventType: eventType 
                });
                
                // Create event collection for this subscription if it doesn't exist
                if (!allEvents.has(subscriptionId)) {
                    allEvents.set(subscriptionId, []);
                }
            }
        } else {
            if (subInfo) {
                // Find and re-enable the option in the dropdown if it exists
                if (subInfo.dropdown) {
                    const options = subInfo.dropdown.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === subInfo.eventType) {
                            options[i].disabled = false;
                            options[i].textContent = subInfo.eventType;
                            break;
                        }
                    }
                }
            }
            
            // If we're unsubscribing from the currently filtered subscription, reset filter
            if (activeFilter === subscriptionId) {
                setActiveFilter(null);
            }
            
            activeClientSubscriptions.delete(subscriptionId);
            
            // Remove events for this subscription
            allEvents.delete(subscriptionId);
        }
        
        updateActiveSubscriptionsDisplay();
    }

    function updateActiveSubscriptionsDisplay() {
        activeSubscriptionsDiv.innerHTML = '<h4>ACTIVE SUBSCRIPTIONS</h4>';
        if (activeClientSubscriptions.size === 0) {
            activeSubscriptionsDiv.innerHTML += '<p class="empty-message">NO ACTIVE SUBSCRIPTIONS</p>';
            return;
        }
        
        const ul = document.createElement('ul');
        activeClientSubscriptions.forEach((sub, id) => {
            const li = document.createElement('li');
            li.className = 'subscription-item';
            
            // Add active class if this is the current filter
            if (activeFilter === id) {
                li.classList.add('active-subscription');
            }
            
            // Make the subscription item clickable to filter events
            li.addEventListener('click', (e) => {
                // Only handle clicks on the item itself, not on buttons
                if (e.target === li || e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    setActiveFilter(id);
                    updateActiveSubscriptionsDisplay(); // Refresh to highlight active
                }
            });
            
            // Create subscription info
            const infoSpan = document.createElement('span');
            infoSpan.innerHTML = `<span class="mono">${id}</span> | ${sub.eventType} <span class="secondary">(${sub.packageId || 'N/A'})</span>`;
            li.appendChild(infoSpan);
            
            // Create unsubscribe button with consistent styling with main buttons
            const unsubBtn = document.createElement('button');
            unsubBtn.innerHTML = '<i class="fas fa-times"></i>';
            unsubBtn.className = 'small-btn icon-button';
            unsubBtn.title = 'Unsubscribe';
            unsubBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the li click
                socket.send(JSON.stringify({ 
                    type: 'unsubscribe', 
                    payload: { subscriptionId: id } 
                }));
                unsubBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                unsubBtn.disabled = true;
            });
            
            li.appendChild(unsubBtn);
            ul.appendChild(li);
        });
        
        activeSubscriptionsDiv.appendChild(ul);
        
        // Add 'All Events' button
        const allEventsBtn = document.createElement('button');
        allEventsBtn.className = 'view-all-btn' + (activeFilter === null ? ' active-filter-btn' : '');
        allEventsBtn.textContent = 'VIEW ALL EVENTS';
        allEventsBtn.addEventListener('click', () => {
            setActiveFilter(null);
            updateActiveSubscriptionsDisplay();
        });
        
        activeSubscriptionsDiv.appendChild(allEventsBtn);
    }
    
    function setActiveFilter(subscriptionId) {
        activeFilter = subscriptionId;
        
        // Update feed heading
        updateFeedHeading();
        
        // Refresh the feed display based on filter
        refreshEventFeed();
    }
    
    function updateFeedHeading() {
        const feedHeading = eventFeedContainer.querySelector('h3');
        
        if (activeFilter === null) {
            feedHeading.innerHTML = '<span class="blink">[</span> LIVE FEED <span class="blink">]</span>';
        } else {
            const subInfo = activeClientSubscriptions.get(activeFilter);
            if (subInfo) {
                feedHeading.innerHTML = `<span class="blink">[</span> EVENTS FOR <span class="mono">${activeFilter}</span> <span class="blink">]</span>`;
            } else {
                // Fallback if subscription doesn't exist
                feedHeading.innerHTML = '<span class="blink">[</span> LIVE FEED <span class="blink">]</span>';
            }
        }
    }
    
    function refreshEventFeed() {
        // Clear current feed
        eventFeedList.innerHTML = '';
        
        if (activeFilter === null) {
            // Show all events, latest first
            const allEventsList = [];
            
            // Collect all events from all subscriptions
            for (const [subId, events] of allEvents.entries()) {
                events.forEach(event => {
                    allEventsList.push({
                        subscriptionId: subId,
                        ...event
                    });
                });
            }
            
            // Sort by timestamp, newest first
            allEventsList.sort((a, b) => b.timestamp - a.timestamp);
            
            // Add to feed
            allEventsList.forEach(event => {
                appendEventToFeedElement(event.subscriptionId, event);
            });
        } else {
            // Show only events for the active subscription
            const events = allEvents.get(activeFilter) || [];
            
            // Sort by timestamp, newest first
            events.sort((a, b) => b.timestamp - a.timestamp);
            
            // Add to feed
            events.forEach(event => {
                appendEventToFeedElement(activeFilter, event);
            });
        }
    }
    
    function storeAndAppendEvent(subscriptionId, eventData) {
        // Make sure we have a collection for this subscription
        if (!allEvents.has(subscriptionId)) {
            allEvents.set(subscriptionId, []);
        }
        
        // Add timestamp for sorting
        const eventWithTimestamp = {
            ...eventData,
            timestamp: parseInt(eventData.timestampMs)
        };
        
        // Store the event
        allEvents.get(subscriptionId).push(eventWithTimestamp);
        
        // If there's no filter, or if this event matches the filter, add it to the feed
        if (activeFilter === null || activeFilter === subscriptionId) {
            appendEventToFeedElement(subscriptionId, eventWithTimestamp);
        }
    }

    function appendEventToFeedElement(subscriptionId, eventData) {
        const subInfo = activeClientSubscriptions.get(subscriptionId);
        const eventTypeDisplay = subInfo ? subInfo.eventType : subscriptionId;

        const li = document.createElement('li');
        const timestamp = new Date(parseInt(eventData.timestampMs)).toLocaleString();
        
        // Extract transaction ID - it's in the id field of the event
        const txId = eventData.id?.txDigest || '';
        
        // Create SuiScan links if txId is available
        let txLink = '';
        if (txId) {
            txLink = `<div class="tx-links">
                <a href="https://suiscan.xyz/mainnet/tx/${txId}" target="_blank" class="explorer-link">
                    <i class="fas fa-external-link-alt"></i> SuiScan
                </a>
            </div>`;
        }
        
        li.innerHTML = `
            <div class="event-header">
                <strong class="event-type">${eventTypeDisplay}</strong> 
                <span class="timestamp">${timestamp}</span>
                ${txLink}
            </div>
            <pre>${JSON.stringify(eventData.parsedJson || eventData, null, 2)}</pre>
        `;
        
        eventFeedList.prepend(li); // Add new events to the top

        // Optional: Limit the number of events in the feed
        if (eventFeedList.children.length > 100) { 
            eventFeedList.removeChild(eventFeedList.lastChild);
        }
    }

    function appendMessageToFeed(messageText) {
        const li = document.createElement('li');
        li.className = 'system-message';
        li.innerHTML = `<div class="event-header"><strong>SYSTEM</strong></div><p>${messageText}</p>`;
        eventFeedList.prepend(li);
    }
}); 