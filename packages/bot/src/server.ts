require('./global');
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Convert module imports to CommonJS style
const Fastify = require('fastify');

const {
    bootstrapDomain,
    destroyDomain,
    enterGroup,
    leaveGroup,
    joinGroup,
    setForMeGroupsAndWait,
    getForMeGroupList,
    getMyGroupList,
    getGroupMessageList,
    sendMessageToGroup
} = require('./domainManager');

const fastify: FastifyInstance = Fastify({ logger: true });

let domainMemory: { [address: string]: any } = {}; // Store domains in memory
let groupEntryMemory: { [address: string]: boolean } = {}; // Track if an address has entered a group

// Handle domain operation
const handleDomainOperation = async (data: any) => {
    const { type, address, groupId, message, size, privateKeyHex } = data;
    const lowerCaseAddress = address.toLowerCase(); // Ensure address is in lowercase
    let domain = domainMemory[lowerCaseAddress]; // Retrieve domain from memory

    if (type === 'bootstrap') {
        if (!domain) {
            domain = await bootstrapDomain(lowerCaseAddress, privateKeyHex!);
            domainMemory[lowerCaseAddress] = domain; // Store the domain in memory
        }
        return { status: 'bootstrap complete', address: lowerCaseAddress };
    }

    if (!domain) {
        throw new Error(`Domain for address ${lowerCaseAddress} not found. Please bootstrap first.`);
    }

    switch (type) {
        case 'destroy':
            await destroyDomain(lowerCaseAddress);
            delete domainMemory[lowerCaseAddress];
            delete groupEntryMemory[lowerCaseAddress]; // Clean up group tracking
            return { status: 'destroy complete', address: lowerCaseAddress };

        case 'enter-group':
            await enterGroup(domain, lowerCaseAddress, groupId!); // Pass both domain and address
            groupEntryMemory[lowerCaseAddress] = true; // Mark the group as entered
            return { status: 'group entered', groupId };

        case 'leave-group':
            await leaveGroup(domain, groupId!);
            groupEntryMemory[lowerCaseAddress] = false; // Mark the group as left
            return { status: 'group left', groupId };

        case 'send-message-to-group':
            if (!groupEntryMemory[lowerCaseAddress]) {
                throw new Error(`Address ${lowerCaseAddress} has not entered any group. Please enter a group first.`);
            }
            const sendMessageResult = await sendMessageToGroup(domain, groupId!, message!);
            return { status: 'message sent', sendMessageResult };

        case 'get-group-message-list':
            if (!groupEntryMemory[lowerCaseAddress]) {
                throw new Error(`Address ${lowerCaseAddress} has not entered any group. Please enter a group first.`);
            }
            const messageList = await getGroupMessageList(domain, groupId!, size);
            return { status: 'success', messageList };

        default:
            throw new Error('Unknown operation');
    }
};

// Define schemas for request validation
const bootstrapSchema = {
    body: {
        type: 'object',
        required: ['address'],
        properties: {
            address: { type: 'string' }
        }
    }
};

// Define Fastify request body and query types
interface BootstrapRequest {
    Body: {
        address: string;
        privateKeyHex: string;
    };
}

interface GroupRequest {
    Body: {
        address: string;
        groupId: string;
    };
}

interface SetForMeGroupsRequest {
    Body: {
        address: string;
        includes: string[];
        excludes: string[];
    };
}

interface GetGroupMessageListRequest {
    Body: {
        address: string;
        groupId: string;
        size: number;
    };
}

interface SendMessageRequest {
    Body: {
        address: string;
        groupId: string;
        message: string;
    };
}

interface GroupListQuery {
    Querystring: {
        address: string;
    };
}

// Routes
fastify.post<{ Body: { address: string; groupId: string; privateKeyHex: string } }>('/api/bootstrap-and-enter-group', { schema: bootstrapSchema }, async (request: FastifyRequest<{ Body: { address: string; groupId: string; privateKeyHex: string } }>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        console.log('Received bootstrap-and-enter-group request:', request.body);
        const result = await handleDomainOperation({
            type: 'bootstrap',
            address,
            privateKeyHex: request.body.privateKeyHex
        });

        reply.send({ status: 'bootstrap complete', address });

        setTimeout(async () => {
            try {
                const enterGroupResult = await handleDomainOperation({
                    type: 'enter-group',
                    address,
                    groupId: request.body.groupId
                });
                console.log('Entered group after delay:', enterGroupResult);
            } catch (error) {
                console.error('Failed to enter group after delay:', error);
            }
        }, 30000);

    } catch (error: unknown) {
        console.error('Failed to bootstrap and enter group:', error);
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<BootstrapRequest>('/api/bootstrap', { schema: bootstrapSchema }, async (request: FastifyRequest<BootstrapRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({ type: 'bootstrap', address, privateKeyHex: request.body.privateKeyHex });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GroupRequest>('/api/enter-group', { schema: bootstrapSchema }, async (request: FastifyRequest<GroupRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({
            type: 'enter-group',
            address,
            groupId: request.body.groupId
        });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GroupRequest>('/api/leave-group', { schema: bootstrapSchema }, async (request: FastifyRequest<GroupRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({ type: 'leave-group', address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GroupRequest>('/api/join-group', { schema: bootstrapSchema }, async (request: FastifyRequest<GroupRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({ type: 'join-group', address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<SetForMeGroupsRequest>('/api/set-for-me-groups', { schema: bootstrapSchema }, async (request: FastifyRequest<SetForMeGroupsRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({
            type: 'set-for-me-groups',
            address,
            includes: request.body.includes,
            excludes: request.body.excludes
        });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Get "for me" group list
fastify.get<GroupListQuery>('/api/get-for-me-group-list', async (request: FastifyRequest<GroupListQuery>, reply: FastifyReply) => {
    try {
        const address = request.query.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({ type: 'get-for-me-group-list', address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Get my group list
fastify.get<GroupListQuery>('/api/get-my-group-list', async (request: FastifyRequest<GroupListQuery>, reply: FastifyReply) => {
    try {
        const address = request.query.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({ type: 'get-my-group-list', address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GetGroupMessageListRequest>('/api/get-group-message-list', { schema: bootstrapSchema }, async (request: FastifyRequest<GetGroupMessageListRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({
            type: 'get-group-message-list',
            address,
            groupId: request.body.groupId,
            size: request.body.size
        });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});


fastify.post<SendMessageRequest>('/api/send-message-to-group', { schema: bootstrapSchema }, async (request: FastifyRequest<SendMessageRequest>, reply: FastifyReply) => {
    try {
        const address = request.body.address.toLowerCase(); // Convert to lowercase
        const result = await handleDomainOperation({
            type: 'send-message-to-group',
            address,
            groupId: request.body.groupId,
            message: request.body.message
        });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Start the server
fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    fastify.log.info(`Server running on ${address}`);
});
