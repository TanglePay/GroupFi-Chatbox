import { Singleton } from "typescript-ioc";
import GroupFiSDKFacade from "groupfi-sdk-facade"
import { IMessage } from 'iotacat-sdk-core'
// IMMessage <-> UInt8Array
// IRecipient <-> UInt8Array
@Singleton
export class GroupFiProtocolService {
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

}