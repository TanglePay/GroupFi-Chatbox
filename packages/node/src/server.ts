// Keep the types as they are since TypeScript will handle them
require('./global');
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

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

// Helper function to handle domain operations
const handleDomainOperation = async (data: any) => {
    const { type, address, groupId, includes, excludes, message, key, messageId, direction, size, mnemonic } = data;
    let domain = domainMemory[address]; // Retrieve the domain from memory
    // log method and data
    console.log('Method: handleDomainOperation', 'Data:', data);
    if (type === 'bootstrap') {
        if (!domain) {
            domain = await bootstrapDomain(address, mnemonic!); // Pass mnemonic when bootstrapping
            domainMemory[address] = domain; // Store the domain in memory
        }
        return { status: 'bootstrap complete', address };
    }

    if (!domain) {
        throw new Error(`Domain for address ${address} not found. Please bootstrap first.`);
    }

    switch (type) {
        case 'destroy':
            await destroyDomain(address);
            delete domainMemory[address]; // Remove the domain from memory after destroying
            return { status: 'destroy complete', address };

        case 'enter-group':
            await enterGroup(domain, groupId!);
            return { status: 'group entered', groupId };

        case 'leave-group':
            await leaveGroup(domain, groupId!);
            return { status: 'group left', groupId };

        case 'join-group':
            await joinGroup(domain, groupId!);
            return { status: 'group joined', groupId };

        case 'set-for-me-groups':
            await setForMeGroupsAndWait(domain, includes!, excludes!); // Updated method to wait for callback
            return { status: 'for me groups set' };

        case 'get-for-me-group-list':
            const forMeGroupList = await getForMeGroupList(domain);
            return { status: 'success', forMeGroupList };

        case 'get-my-group-list':
            const myGroupList = await getMyGroupList(domain);
            return { status: 'success', myGroupList };

        case 'get-group-message-list':
            const messageList = await getGroupMessageList(domain, groupId!, key!, messageId, direction!, size!);
            return { status: 'success', messageList };

        case 'send-message-to-group':
            const sendMessageResult = await sendMessageToGroup(domain, groupId!, message!);
            return { status: 'message sent', sendMessageResult };

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

// Define FastifyRequest body interfaces
interface BootstrapRequest {
    Body: {
        address: string;
        mnemonic: string;
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
        key: string;
        messageId: string;
        direction: string;
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

// Routes
fastify.post<BootstrapRequest>('/api/bootstrap', { schema: bootstrapSchema }, async (request: FastifyRequest<BootstrapRequest>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({ type: 'bootstrap', address: request.body.address, mnemonic: request.body.mnemonic });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GroupRequest>('/api/enter-group', { schema: bootstrapSchema }, async (request: FastifyRequest<GroupRequest>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({ type: 'enter-group', address: request.body.address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GroupRequest>('/api/leave-group', { schema: bootstrapSchema }, async (request: FastifyRequest<GroupRequest>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({ type: 'leave-group', address: request.body.address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GroupRequest>('/api/join-group', { schema: bootstrapSchema }, async (request: FastifyRequest<GroupRequest>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({ type: 'join-group', address: request.body.address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<SetForMeGroupsRequest>('/api/set-for-me-groups', { schema: bootstrapSchema }, async (request: FastifyRequest<SetForMeGroupsRequest>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({
            type: 'set-for-me-groups',
            address: request.body.address,
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
fastify.get<{ Querystring: { address: string } }>('/api/get-for-me-group-list', async (request: FastifyRequest<{ Querystring: { address: string } }>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({ type: 'get-for-me-group-list', address: request.query.address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Get my group list
fastify.get<{ Querystring: { address: string } }>('/api/get-my-group-list', async (request: FastifyRequest<{ Querystring: { address: string } }>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({ type: 'get-my-group-list', address: request.query.address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

fastify.post<GetGroupMessageListRequest>('/api/get-group-message-list', { schema: bootstrapSchema }, async (request: FastifyRequest<GetGroupMessageListRequest>, reply: FastifyReply) => {
    try {
        const result = await handleDomainOperation({
            type: 'get-group-message-list',
            address: request.body.address,
            groupId: request.body.groupId,
            key: request.body.key,
            messageId: request.body.messageId,
            direction: request.body.direction,
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
        const result = await handleDomainOperation({
            type: 'send-message-to-group',
            address: request.body.address,
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
