

export function logAllMethods(obj: any) {
    let properties = new Set<string>();
  
    // Get all properties and methods from the object itself
    let currentObj = obj;
    do {
      Object.getOwnPropertyNames(currentObj).forEach((item) => properties.add(item));
    } while ((currentObj = Object.getPrototypeOf(currentObj))); // Traverse the prototype chain
  
    // Filter only methods
    const methods = Array.from(properties).filter((prop) => typeof obj[prop] === 'function');
  
    console.log('Methods:', methods);
  }

  export function debounce<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
): (this: ThisParameterType<T>, ...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;

    return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);  // Ensure the correct 'this' context
        }, delay);
    };
}

