import { parentPort } from 'worker_threads';
import {
    bootstrapDomain,
    destroyDomain,
    enterGroup,
    leaveGroup,
    joinGroup,
    setForMeGroupsAndWait,  // Use the updated method
    getForMeGroupList,
    getMyGroupList,
    getGroupMessageList,
    sendMessageToGroup
} from './domainManager';
import { WorkerRequest, WorkerResponse, WorkerError } from './types';

let domainMemory: { [address: string]: any } = {}; // Store domains in memory

parentPort?.on('message', async (data: WorkerRequest) => {
    const { type, address, groupId, includes, excludes, message, key, messageId, direction, size, mnemonic } = data; // Add mnemonic

    try {
        let result: WorkerResponse;
        let domain = domainMemory[address]; // Retrieve the domain from memory

        if (type === 'bootstrap') {
            if (!domain) {
                domain = await bootstrapDomain(address, mnemonic!); // Pass mnemonic when bootstrapping
                domainMemory[address] = domain; // Store the domain in memory
            }
            result = { status: 'bootstrap complete', address };
        } else {
            if (!domain) {
                throw new Error(`Domain for address ${address} not found. Please bootstrap first.`);
            }

            switch (type) {
                case 'destroy':
                    await destroyDomain(address);
                    delete domainMemory[address]; // Remove the domain from memory after destroying
                    result = { status: 'destroy complete', address };
                    break;

                case 'enter-group':
                    await enterGroup(domain, groupId!);
                    result = { status: 'group entered', groupId };
                    break;

                case 'leave-group':
                    await leaveGroup(domain, groupId!);
                    result = { status: 'group left', groupId };
                    break;

                case 'join-group':
                    await joinGroup(domain, groupId!);
                    result = { status: 'group joined', groupId };
                    break;

                case 'set-for-me-groups':
                    await setForMeGroupsAndWait(domain, includes!, excludes!); // Updated method to wait for callback
                    result = { status: 'for me groups set' };
                    break;

                case 'get-for-me-group-list':
                    const forMeGroupList = await getForMeGroupList(domain);
                    result = { status: 'success', forMeGroupList };
                    break;

                case 'get-my-group-list':
                    const myGroupList = await getMyGroupList(domain);
                    result = { status: 'success', myGroupList };
                    break;

                case 'get-group-message-list':
                    const messageList = await getGroupMessageList(domain, groupId!, key!, messageId, direction!, size!);
                    result = { status: 'success', messageList };
                    break;

                case 'send-message-to-group':
                    const sendMessageResult = await sendMessageToGroup(domain, groupId!, message!);
                    result = { status: 'message sent', sendMessageResult };
                    break;

                default:
                    result = { status: 'error', message: 'Unknown operation' };
            }
        }

        // Send the result back to the main thread
        parentPort?.postMessage(result);

    } catch (error: any) {
        const errResponse: WorkerError = { status: 'error', message: error.message || 'An unknown error occurred' };
        parentPort?.postMessage(errResponse);
    }
});
