import { Singleton } from "typescript-ioc";
import { IIncludesAndExcludes, PairX, UserMode, IEncryptedPairX } from "../types";
import EventEmitter from "events";
import { Map, List } from "immutable";

@Singleton
export class SharedContext {
    private _state = Map<string, any>({
        includesAndExcludes: List<IIncludesAndExcludes>(),
        walletAddress: '',
        // undefined 表示不知道有没有pairX
        // null 表示没有pairX
        pairX: undefined as PairX | undefined | null,
        proxyAddress: undefined as string | undefined,
        encryptionPublicKey: undefined as string | undefined,
        signature: undefined as string | undefined,
        encryptedPairX: undefined as Map<string, string> | undefined,
        userBrowseMode: false,
        name: undefined as string | undefined,
        allGroupIds: List<string>(),
    });

    private _events = new EventEmitter();

    get isIncludeGroupNamesSet(): boolean {
        return (this._state.get('includesAndExcludes') as List<IIncludesAndExcludes>).size > 0;
    }

    get includesAndExcludes(): IIncludesAndExcludes[] {
        return (this._state.get('includesAndExcludes') as List<IIncludesAndExcludes>).toArray();
    }

    setIncludesAndExcludes(includesAndExcludes: IIncludesAndExcludes[], whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('includesAndExcludes', List(includesAndExcludes));
        if (!this._state.equals(previousState)) {
            console.log(`setIncludesAndExcludes: from ${previousState.get('includesAndExcludes')} to ${includesAndExcludes} by ${whoDidThis} because ${why}`);
            this._events.emit('includesAndExcludesChanged');
        } else {
            console.log(`setIncludesAndExcludes: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    onIncludesAndExcludesChanged(callback: () => void) {
        this._events.on('includesAndExcludesChanged', callback);
    }

    offIncludesAndExcludesChanged(callback: () => void) {
        this._events.off('includesAndExcludesChanged', callback);
    }

    clearIncludesAndExcludes(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('includesAndExcludes', List<IIncludesAndExcludes>());
        if (!this._state.equals(previousState)) {
            console.log(`clearIncludesAndExcludes: from ${previousState.get('includesAndExcludes')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearIncludesAndExcludes: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get isWalletConnected(): boolean {
        return !!this._state.get('walletAddress');
    }
    onWalletConnectedChanged(callback: () => void) {
        this._events.on('walletConnectedChanged', callback);
    }
    offWalletConnectedChanged(callback: () => void) {
        this._events.off('walletConnectedChanged', callback);
    }
    onWalletAddressChanged(callback: () => void) {
        this._events.on('walletAddressChanged', callback);
    }
    offWalletAddressChanged(callback: () => void) {
        this._events.off('walletAddressChanged', callback);
    }
    get walletAddress(): string {
        return this._state.get('walletAddress') as string;
    }

    setWalletAddress(walletAddress: string, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('walletAddress', walletAddress);
        if (!this._state.equals(previousState)) {
            console.log(`setWalletAddress: from ${previousState.get('walletAddress')} to ${walletAddress} by ${whoDidThis} because ${why}`);
            // emit event
            this._events.emit('walletAddressChanged');
            // emit walletConnectedChanged
            this._events.emit('walletConnectedChanged');
        } else {
            console.log(`setWalletAddress: no change detected by ${whoDidThis} because ${why}`);
        }
    }
    
    clearWalletAddress(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('walletAddress', '');
        if (!this._state.equals(previousState)) {
            console.log(`clearWalletAddress: from ${previousState.get('walletAddress')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearWalletAddress: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get pairX(): PairX | undefined | null {
        return this._state.get('pairX') as PairX | undefined | null
    }

    get isPairXSet(): boolean {
        return !!this._state.get('pairX');
    }
    onPairXChanged(callback: () => void) {
        this._events.on('pairXChanged', callback);
    }
    offPairXChanged(callback: () => void) {
        this._events.off('pairXChanged', callback);
    }
    setPairX(pairX: PairX | null | undefined, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('pairX', pairX);
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged');
            // emit pairX changed
            this._events.emit('pairXChanged');
            console.log(`setPairX: from ${previousState.get('pairX')} to ${pairX} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearPairX(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('pairX', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearPairX: from ${previousState.get('pairX')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get encryptedPairX(): Map<string, string> | undefined {
        return this._state.get('encryptedPairX') as Map<string, string> | undefined;
    }

    get encryptedPairXObj(): IEncryptedPairX | undefined {
        if (!this._state.get('encryptedPairX')) {
            return undefined
        }
        return {
            publicKey: this._state.get('encryptedPairX').get('publicKey') as string,
            privateKeyEncrypted: this._state.get('encryptedPairX').get('privateKeyEncrypted') as string, 
        }
    }

    setEncryptedPairX(encryptedPairX: IEncryptedPairX, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('encryptedPairX', Map<string,string>({
            publicKey: encryptedPairX.publicKey,
            privateKeyEncrypted: encryptedPairX.privateKeyEncrypted
        }));
        if (!this._state.equals(previousState)) {
            console.log(`setEncryptedPairX: from ${previousState.get('encryptedPairX')} to ${JSON.stringify(encryptedPairX)} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setEncryptedPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearEncryptedPairX(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('encryptedPairX', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearEncryptedPairX: from ${previousState.get('encryptedPairX')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearEncryptedPairX: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get proxyAddress(): string | undefined {
        return this._state.get('proxyAddress')
    }

    setProxyAddress(proxyAddress: string, whoDidThis: string, why: string) {
        const previousState = this._state
        this._state = this._state.set('proxyAddress', proxyAddress)
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged')
            // emit register event
            this._events.emit('registerStatusChanged')
            console.log(`setProxyAddress: from ${previousState.get('proxyAddress')} to ${proxyAddress} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setProxyAddress: no change detected by ${whoDidThis} because ${why}`);
        }
    }
    
    clearProxyAddress(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('proxyAddress', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearProxyAddress: from ${previousState.get('proxyAddress')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`proxyAddress: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get encryptionPublicKey(): string | undefined {
        return this._state.get('encryptionPublicKey') as string | undefined
    }

    setEncryptionPublicKey(encryptionPublicKey: string, whoDidThis: string, why: string) {
        const previousState = this._state
        this._state = this._state.set('encryptionPublicKey', encryptionPublicKey)
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged')
            console.log(`setEncryptionPublicKey: from ${previousState.get('encryptionPublicKey')} to ${encryptionPublicKey} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setEncryptionPublicKey: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearEncryptionPublicKey(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('encryptionPublicKey', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearEncryptionPublicKey: from ${previousState.get('encryptionPublicKey')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearEncryptionPublicKey: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get signature(): string | undefined {
        return this._state.get('signature') as string | undefined
    }

    setSignature(signature: string, whoDidThis: string, why: string) {
        const previousState = this._state
        this._state = this._state.set('signature', signature)
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged')
            console.log(`setSignature: from ${previousState.get('signature')} to ${signature} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setSignature: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearSignature(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('signature', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearSignature: from ${previousState.get('signature')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearSignature: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    get userBrowseMode(): boolean {
        return this._state.get('userBrowseMode') as boolean;
    }

    setUserBrowseMode(userBrowseMode: boolean, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('userBrowseMode', userBrowseMode);
        if (!this._state.equals(previousState)) {
            this._events.emit('loginStatusChanged');
            console.log(`setUserBrowseMode: from ${previousState.get('userBrowseMode')} to ${userBrowseMode} by ${whoDidThis} because ${why}`);
        } else {
            console.log(`setUserBrowseMode: no change detected by ${whoDidThis} because ${why}`);
        }
    }


    get userMode(): UserMode {
        return this.isLoggedIn ? 'login' : 'browse';
    }

    // get isLoggedIn(): boolean {
    //     return !this._state.get('userBrowseMode') && !!this._state.get('pairX');
    // }
    get isLoggedIn(): boolean {
        return !!this._state.get('proxyAddress') && !!this._state.get('pairX')
    }
    onLoginStatusChanged(callback: () => void) {
        this._events.on('loginStatusChanged', callback);
    }

    offLoginStatusChanged(callback: () => void) {
        this._events.off('loginStatusChanged', callback);
    }
    get isWaitForLogin(): boolean {
        return !this._state.get('pairX') && !!this._state.get('encryptedPairX');
    }

    get isRegistered(): boolean {
        return !!this._state.get('proxyAddress')
    }
    onRegisterStatusChanged(callback: () => void) {
        this._events.on('registerStatusChanged', callback)
    }
    offRegisterStatusChanged(callback: () => void) {
        this._events.off('registerStatusChanged', callback)
    }
    get isEncryptionPublicKeySet(): boolean {
        return !!this._state.get('encryptionPublicKey')
    }

    get isSignatureSet(): boolean {
        return !!this._state.get('signature')
    }

    get isDidSet(): boolean {
        return !!this._state.get('name');
    }

    get name(): string {
        return this._state.get('name') as string;
    }

    setName(name: string, whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('name', name);
        if (!this._state.equals(previousState)) {
            console.log(`setName: from ${previousState.get('name')} to ${name} by ${whoDidThis} because ${why}`);
            this._events.emit('nameChanged')
        } else {
            console.log(`setName: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    clearName(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('name', undefined);
        if (!this._state.equals(previousState)) {
            console.log(`clearName: from ${previousState.get('name')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearName: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    onNameChanged(callback: () => void) {
        this._events.on('nameChanged', callback)
    }

    offNameChanged(callback:() => void) {
        this._events.off('nameChanged', callback)
    }
    

    get isAllGroupIdsSet(): boolean {
        return (this._state.get('allGroupIds') as List<string>).size > 0;
    }

    get allGroupIds(): string[] {
        return (this._state.get('allGroupIds') as List<string>).toArray();
    }

    setAllGroupIds(allGroupIds: string[], whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('allGroupIds', List(allGroupIds));
        if (!this._state.equals(previousState)) {
            console.log(`setAllGroupIds: from ${previousState.get('allGroupIds')} to ${allGroupIds} by ${whoDidThis} because ${why}`);
            this._events.emit('allGroupIdsChanged');
        } else {
            console.log(`setAllGroupIds: no change detected by ${whoDidThis} because ${why}`);
        }
    }

    onAllGroupIdsChanged(callback: () => void) {
        this._events.on('allGroupIdsChanged', callback);
    }
    offAllGroupIdsChanged(callback: () => void) {
        this._events.off('allGroupIdsChanged', callback);
    }

    clearAllGroupIds(whoDidThis: string, why: string) {
        const previousState = this._state;
        this._state = this._state.set('allGroupIds', List<string>());
        if (!this._state.equals(previousState)) {
            console.log(`clearAllGroupIds: from ${previousState.get('allGroupIds')} to undefined by ${whoDidThis} because ${why}`);
        } else {
            console.log(`clearAllGroupIds: no change detected by ${whoDidThis} because ${why}`);
        }
    }
}
