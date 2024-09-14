import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { Worker } from 'worker_threads';
import path from 'path';

const fastify = Fastify({ logger: true });
const workerPath = path.resolve(__dirname, 'worker.js');

// Initialize the worker thread
const worker = new Worker(workerPath);

// Helper function to communicate with the worker
const sendToWorker = (message: any) => {
    return new Promise((resolve, reject) => {
        worker.postMessage(message);
        worker.once('message', resolve);
        worker.once('error', reject);
    });
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

const destroySchema = {
    body: {
        type: 'object',
        required: ['address'],
        properties: {
            address: { type: 'string' }
        }
    }
};

const groupRequestSchema = {
    body: {
        type: 'object',
        required: ['address', 'groupId'],
        properties: {
            address: { type: 'string' },
            groupId: { type: 'string' }
        }
    }
};

const setForMeGroupsSchema = {
    body: {
        type: 'object',
        required: ['address', 'includes', 'excludes'],
        properties: {
            address: { type: 'string' },
            includes: { type: 'array', items: { type: 'string' } },
            excludes: { type: 'array', items: { type: 'string' } }
        }
    }
};

const getGroupMessageListSchema = {
    body: {
        type: 'object',
        required: ['address', 'groupId', 'key', 'messageId', 'direction', 'size'],
        properties: {
            address: { type: 'string' },
            groupId: { type: 'string' },
            key: { type: 'string' },
            messageId: { type: 'string' },
            direction: { type: 'string' },
            size: { type: 'number' }
        }
    }
};

const sendMessageSchema = {
    body: {
        type: 'object',
        required: ['address', 'groupId', 'message'],
        properties: {
            address: { type: 'string' },
            groupId: { type: 'string' },
            message: { type: 'string' }
        }
    }
};

// Bootstrap domain
fastify.post<{ Body: { address: string } }>('/api/bootstrap', {
    schema: bootstrapSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'bootstrap', address: request.body.address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Destroy domain
fastify.post<{ Body: { address: string } }>('/api/destroy', {
    schema: destroySchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'destroy', address: request.body.address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Enter group
fastify.post<{ Body: { address: string; groupId: string } }>('/api/enter-group', {
    schema: groupRequestSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'enter-group', address: request.body.address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Leave group
fastify.post<{ Body: { address: string; groupId: string } }>('/api/leave-group', {
    schema: groupRequestSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'leave-group', address: request.body.address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Join group
fastify.post<{ Body: { address: string; groupId: string } }>('/api/join-group', {
    schema: groupRequestSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'join-group', address: request.body.address, groupId: request.body.groupId });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Set "for me" groups
fastify.post<{ Body: { address: string; includes: string[]; excludes: string[] } }>('/api/set-for-me-groups', {
    schema: setForMeGroupsSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({
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
fastify.get<{ Querystring: { address: string } }>('/api/get-for-me-group-list', async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'get-for-me-group-list', address: request.query.address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Get my group list
fastify.get<{ Querystring: { address: string } }>('/api/get-my-group-list', async (request, reply) => {
    try {
        const result = await sendToWorker({ type: 'get-my-group-list', address: request.query.address });
        reply.send(result);
    } catch (error: unknown) {
        const errMessage = (error instanceof Error) ? error.message : 'Unknown error';
        reply.status(500).send({ status: 'error', message: errMessage });
    }
});

// Get group message list
fastify.post<{ Body: { address: string; groupId: string; key: string; messageId: string; direction: string; size: number } }>('/api/get-group-message-list', {
    schema: getGroupMessageListSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({
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

// Send message to group
fastify.post<{ Body: { address: string; groupId: string; message: string } }>('/api/send-message-to-group', {
    schema: sendMessageSchema
}, async (request, reply) => {
    try {
        const result = await sendToWorker({
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

// Start the server with the recommended syntax
fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    fastify.log.info(`Server running on ${address}`);
});
