

export interface IChannel<T> {
    poll(): T | undefined;
    push(value: T): void;
}


export class Channel<T> implements IChannel<T> {
    private queue: T[] = [];

    poll(): T | undefined {
        return this.queue.shift();
    }

    push(value: T): void {
        this.queue.push(value);
    }
}
