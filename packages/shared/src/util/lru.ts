class DoublyLinkedListNode<T> {
    key: string;
    value: T;
    next: DoublyLinkedListNode<T> | null = null;
    prev: DoublyLinkedListNode<T> | null = null;

    constructor(key: string, value: T) {
        this.key = key;
        this.value = value;
    }
}

export class LRUCache<T> {
    private capacity: number;
    private cache: Map<string, DoublyLinkedListNode<T>>;
    private head: DoublyLinkedListNode<T> | null = null;
    private tail: DoublyLinkedListNode<T> | null = null;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: string): T | null {
        const node = this.cache.get(key);
        if (!node) return null;

        // Move the accessed node to the front (head) of the linked list.
        this.moveToHead(node);

        return node.value;
    }

    put(key: string, value: T): void {
        let node = this.cache.get(key);

        if (node) {
            // Update the value and move it to the head.
            node.value = value;
            this.moveToHead(node);
        } else {
            // If the key does not exist, create a new node and add to the cache.
            node = new DoublyLinkedListNode(key, value);
            this.cache.set(key, node);
            this.addToHead(node);

            // If the cache is over capacity, remove the tail (least recently used).
            if (this.cache.size > this.capacity) {
                if (this.tail) {
                    this.cache.delete(this.tail.key);
                    this.removeNode(this.tail);
                }
            }
        }
    }

    delete(key: string): boolean {
        const node = this.cache.get(key);
        if (!node) return false;  // If the key does not exist in the cache, return false.
    
        // Remove the node from the cache and the doubly linked list.
        this.cache.delete(key);
        this.removeNode(node);
    
        return true;  // Successfully deleted the node.
    }

    
    private moveToHead(node: DoublyLinkedListNode<T>): void {
        this.removeNode(node);
        this.addToHead(node);
    }

    private removeNode(node: DoublyLinkedListNode<T>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
    }

    private addToHead(node: DoublyLinkedListNode<T>): void {
        node.next = this.head;
        node.prev = null;

        if (this.head) {
            this.head.prev = node;
        }

        this.head = node;

        if (!this.tail) {
            this.tail = node;
        }
    }

    clear() {
        this.cache.clear();
        this.head = null;
        this.tail = null;
    }
    
}

