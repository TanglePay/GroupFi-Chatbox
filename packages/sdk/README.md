# GroupFi Trollbox SDK

The GroupFi Trollbox SDK enables Dapps to easily integrate with the GroupFi Trollbox chat application.

## Installation
To incorporate the `groupfi_trollbox_sdk` into your project, execute one of the following commands in your project's root directory:


```sh
pnpm add groupfi_trollbox_sdk

# Or, if you're using NPM:
npm install groupfi_trollbox_sdk
```

## Usage
1. Ensuring Trollbox Ready

Before leveraging the capabilities of the GroupFi Trollbox SDK, make sure that the Trollbox is ready:

```typescript
# // Use the window.addEventListener method
window.addEventListener('trollbox-ready', (event: CustomEvent) => {
  console.log(`Trollbox is ready with version: ${event.detail.trollboxVersion}`);
});

// Or, using the TrollboxSDK event emitter
import TrollboxSDK from 'groupfi_trollbox_sdk'

TrollboxSDK._events.on('trollbox-ready', (data: { trollboxVersion: string }) => {
  console.log(`Trollbox is ready with version: ${data.trollboxVersion}`);
});
```

2. Monitoring Connection Status with GroupFi Trollbox

To track the connection status of GroupFi Trollbox with the user's wallet:

```typescript
import TrollboxSDK from 'groupfi_trollbox_sdk';

TrollboxSDK.on('wallet-connected-changed', (data: {
  walletConnectData?: {
    walletType: string,
    nodeId: number,
    address: string
  },
  disconnectReason?: string
}) => {
  if (data.walletConnectData) {
    console.log('Wallet connected:', data.walletConnectData);
  } else {
    console.error('Wallet connection failed:', data.disconnectReason);
  }
});
```

3. Customizing Recommended Groups

GroupFi Trollbox displays a set of default recommended groups to each user. Customize these groups as follows:

```typescript
async function setForMeGroups() {
  try {
    const response = await TrollboxSDK.request({
      method: 'setForMeGroups',
      params: {
        includes?: string[],
        excludes?: string[]
      }
    });

    console.log('Set Groups successfully.');
  } catch (error) {
    console.error('Failed to update groups:', error);
  }
}
```

