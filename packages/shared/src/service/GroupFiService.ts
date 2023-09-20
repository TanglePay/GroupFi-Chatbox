import { Singleton } from "typescript-ioc";
import GroupFiSDKFacade, { SimpleDataExtened } from "groupfi-sdk-facade"
import { IMessage } from 'iotacat-sdk-core'
import { off } from "process";
// IMMessage <-> UInt8Array
// IRecipient <-> UInt8Array
@Singleton
export class GroupFiService {
    async bootstrap() {
        await GroupFiSDKFacade.bootstrap();
    }

    async getInboxMessages(cotinuationToken?:string): Promise<{
        messageList: IMessage[],
        nextToken?: string | undefined
    }> {
        const res = await GroupFiSDKFacade.getInboxMessages(cotinuationToken);
        // log
        console.log('getInboxMessages', res);
        return res;
    }
    onNewMessage(callback: (message: IMessage) => void) {
        GroupFiSDKFacade.onNewMessage(callback);
    }
    offNewMessage(){
        GroupFiSDKFacade.offNewMessage();
    }
    getObjectId(obj:Record<string,SimpleDataExtened>) :string {
        return GroupFiSDKFacade.getObjectId(obj);
    }

}