// Keep the type import as it is
import { MessageAggregateRootDomain } from 'groupfi-sdk-shared';

// Convert runtime module imports to CommonJS style
const { SetManager } = require('groupfi-sdk-shared');
const { FileStorageAdaptor } = require('./storage'); // Importing FileStorageAdaptor
const { LocalDappClient } = require('./LocalDappClient'); // Importing LocalDappClient

// Define MessageFetchDirection locally
export type MessageFetchDirection = 'head' | 'tail';

// Maintain registration and login status
const domainStatus = new Map<string, { isRegistered?: boolean, isLoggedIn?: boolean }>();

const loginStatusCallbacks: Record<string, () => void> = {};

// Maintain domain status
export const maintainDomainStatus = (domain: MessageAggregateRootDomain, address: string): void => {
    const updateStatus = async () => {
        const isRegistered = domain.isRegistered();
        const isLoggedIn = domain.isLoggedIn();
        domainStatus.set(address, { isRegistered, isLoggedIn });

        // log address and status
        console.log(`Domain status for ${address}:`, domainStatus.get(address));
        if (isRegistered && !isLoggedIn) {
            domain.login();
        }
        domainStatus.set(address, { isRegistered, isLoggedIn });
    };

    domain.onLoginStatusChanged(updateStatus);
    loginStatusCallbacks[address] = updateStatus;
    updateStatus(); // Initial call to set the status
};

// Bootstrap domain
export const bootstrapDomain = async (address: string, privateKeyHex: string): Promise<MessageAggregateRootDomain> => {
    const setManager = SetManager.getInstance();

    // Retrieve the domain from SetManager
    const messageDomain = setManager.getSet(address);
    // Set Dapp client and storage service during bootstrap
    const dappClient = new LocalDappClient(privateKeyHex); // Create LocalDappClient instance with privateKeyHex
    const storageAdaptor = new FileStorageAdaptor(process.env.STORAGE_PATH || './defaultStoragePath'); // Create FileStorageAdaptor instance with STORAGE_PATH
    messageDomain.setStorageAdaptor(storageAdaptor);
    messageDomain.getGroupFiService().setWalletClient(dappClient); // Use the get method

    try {
        console.log('===> bootstrapDomain start')
        const res = await messageDomain.connectWallet(2, address)
        console.log('===> bootstrapDomain start res', res)

        await messageDomain.bootstrap();
        messageDomain.setWalletAddress(address);
        await messageDomain.setStorageKeyPrefix(address);
        await messageDomain.start();     
        await messageDomain.resume();
    } catch (error) {
        console.log('===> bootstrapDomain error', error)
    }

    console.log('===> bootstrapDomain end')

    

    
    

    maintainDomainStatus(messageDomain, address);

    return messageDomain;
};

// Destroy domain
export const destroyDomain = async (address: string): Promise<void> => {
    const setManager = SetManager.getInstance();
    const messageDomain = setManager.getSet(address);
    const callback = loginStatusCallbacks[address];
    if (messageDomain && callback) {
        messageDomain.offLoginStatusChanged(callback);
        delete loginStatusCallbacks[address];
    }

    if (messageDomain) {
        await messageDomain.pause();
        await messageDomain.stop();
        await messageDomain.destroy();

        setManager.clearSet(address);  // Changed to clearSet
        domainStatus.delete(address); // Remove status from map
    }
};
// Callback function for notifying about a new message in the group
const notifyNewGroupMessage = async (domain: MessageAggregateRootDomain, address: string, groupId: string) => {
    try {
        // Fetch the first message from the group message list
        const groupMessageList = await getGroupMessageList(domain, groupId, 1); // Fetch only the latest message
        const latestMessage = groupMessageList.messages[0]?.message || ''; // Default to empty string if no message found

        // Log that a new message was detected
        console.log(`New message detected in group ${groupId}: ${latestMessage}`);

        // Make a POST request to the remote API using fetch
        const response = await fetch('http://localhost:3010/msg/receive', {  // Adjusted URL based on your API documentation
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account: address,  // Include the address in the request
                groupId,           // Send the groupId
                message: latestMessage,  // Send the latest message text
            }),
        });

        // Check if the response was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`API response for group ${groupId}:`, responseData);
    } catch (error) {
        console.error(`Failed to notify API for new message in group ${groupId}:`, error);
    }
};


// Enter group
export const enterGroup = async (domain: MessageAggregateRootDomain, address: string, groupId: string): Promise<void> => {
    // Use the public wrapper method for entering a group
    await domain.enteringGroupByGroupId(groupId);

    if (domain.isWalletConnected()) {
        domain.getGroupFiService().enablePreparedRemainderHint(); // Use the get method
    }

    // Add a callback for new messages in the group conversation
    domain.onConversationDataChanged(groupId, async () => {
        // log conversation data changed for groupId,
        console.log(`=================================================> Conversation data changed for group ${groupId}`);
        // Notify the remote API when a new message is detected, now including the domain and address
        await notifyNewGroupMessage(domain, address, groupId);
    });
};


// Leave group
export const leaveGroup = async (domain: MessageAggregateRootDomain, groupId: string): Promise<void> => {
    await domain.leaveGroup(groupId);

    if (domain.isWalletConnected()) {
        domain.getGroupFiService().disablePreparedRemainderHint(); // Use the get method
    }
};

// Set "for me" groups and wait for callback
export const setForMeGroupsAndWait = async (domain: MessageAggregateRootDomain, includes: any[], excludes: any[]): Promise<void> => {
    return new Promise<void>((resolve) => {
        const callback = () => {
            domain.offForMeGroupConfigsChanged(callback);
            resolve();
        };

        // Set the callback before triggering the change
        domain.onForMeGroupConfigsChanged(callback);

        // Use setDappIncluding for setting "for me" groups
        domain.setDappIncluding({ includes, excludes });
    });
};

// Get "for me" group list
export const getForMeGroupList = async (domain: MessageAggregateRootDomain): Promise<any[]> => {
    return domain.getForMeGroupConfigs() ?? [];
};

// Get my group list
export const getMyGroupList = async (domain: MessageAggregateRootDomain): Promise<any[]> => {
    return await domain.getInboxList() ?? [];
};

// Get group message list
export const getGroupMessageList = async (
    domain: MessageAggregateRootDomain,
    groupId: string,
    size = 10
): Promise<any> => {
    // Strip 0x prefix if it exists
    if (groupId.startsWith('0x')) {
        groupId = groupId.slice(2);
    }

    // Use the new API to get the latest conversation message list
    const { messages } = await domain.getLatestConversationMessageList(groupId, size);
    return { messages };
};


// Send message to group
export const sendMessageToGroup = async (domain: MessageAggregateRootDomain, groupId: string, message: string): Promise<any> => {
    return await domain.sendMessageToGroup(groupId, message);
};

// Set callback for "for me" or "my group" changes
export const setForMeGroupChangedCallback = (domain: MessageAggregateRootDomain, callback: () => void): void => {
    domain.onForMeGroupConfigsChanged(callback);
};

export const setMyGroupChangedCallback = (domain: MessageAggregateRootDomain, callback: () => void): void => {
    domain.onInboxDataChanged(callback);
};

// Join group
export const joinGroup = async (domain: MessageAggregateRootDomain, groupId: string): Promise<void> => {
    await domain.joinGroup(groupId);
};
