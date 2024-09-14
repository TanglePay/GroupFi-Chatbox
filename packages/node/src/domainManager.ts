import { SetManager, MessageAggregateRootDomain } from 'groupfi_chatbox_shared';
import { FileStorageAdaptor } from './storage'; // Importing FileStorageAdaptor
import { LocalDappClient } from './LocalDappClient'; // Importing LocalDappClient

// Define MessageFetchDirection locally
export type MessageFetchDirection = 'head' | 'tail';

// Bootstrap domain
export const bootstrapDomain = async (address: string, mnemonic: string): Promise<MessageAggregateRootDomain> => {
    const setManager = SetManager.getInstance();

    // Retrieve the domain from SetManager
    const messageDomain = setManager.getSet(address);

    // Set Dapp client and storage service during bootstrap
    const dappClient = new LocalDappClient(mnemonic); // Create LocalDappClient instance with mnemonic
    const storageAdaptor = new FileStorageAdaptor(process.env.STORAGE_PATH || './defaultStoragePath'); // Create FileStorageAdaptor instance with STORAGE_PATH
    messageDomain.setStorageAdaptor(storageAdaptor);
    messageDomain.getGroupFiService().setDappClient(dappClient); // Use the get method

    await messageDomain.browseModeSetupClient();
    await messageDomain.bootstrap();
    messageDomain.setWalletAddress('');
    await messageDomain.setStorageKeyPrefix(address);
    await messageDomain.start();
    await messageDomain.resume();
    messageDomain.setUserBrowseMode(true);

    return messageDomain;
};

// Destroy domain
export const destroyDomain = async (address: string): Promise<void> => {
    const setManager = SetManager.getInstance();
    const messageDomain = setManager.getSet(address);

    if (messageDomain) {
        await messageDomain.pause();
        await messageDomain.stop();
        await messageDomain.destroy();

        setManager.clearSet(address);  // Changed to clearSet
    }
};

// Enter group
export const enterGroup = async (domain: MessageAggregateRootDomain, groupId: string): Promise<void> => {
    // Use the public wrapper method for entering a group
    await domain.enteringGroupByGroupId(groupId);

    if (domain.isWalletConnected()) {
        domain.getGroupFiService().enablePreparedRemainderHint(); // Use the get method
    }
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
    return domain.getForMeGroupConfigs();
};

// Get my group list
export const getMyGroupList = async (domain: MessageAggregateRootDomain): Promise<any[]> => {
    return await domain.getInboxList();
};

// Get group message list
export const getGroupMessageList = async (
    domain: MessageAggregateRootDomain,
    groupId: string,
    key: string,
    messageId: string | undefined,
    direction: MessageFetchDirection,  // Using the locally defined type
    size: number
): Promise<any> => {
    return await domain.getConversationMessageList({
        groupId,
        key,
        messageId,
        direction,
        size
    });
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
