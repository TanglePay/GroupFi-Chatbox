# GroupFi Trollbox SDK

The GroupFi Trollbox SDK provides a integration solution for Dapps to interact with the GroupFi Trollbox chat application. The key responsibilities of the SDK are as follows:

1. Embed the GroupFi Trollbox web interface within the Dapp using an iframe.
2. Offer tools that facilitate communication between the Dapp and the GroupFi Trollbox chat.

## Installation
To incorporate the `groupfi-trollbox-sdk` into your project, execute one of the following commands in your project's root directory:


```sh
pnpm add groupfi-trollbox-sdk

# Or, if you're using NPM:
npm install groupfi-trollbox-sdk
```

## Usage
The GroupFi Trollbox SDK is provided in two build formats: IIFE and ESM, so you can choose the one that best fits your requirements.

1. **Embedding the GroupFi Trollbox Web Page in your Dapp:**

  * Use the `IIFE` build products.

      ```html
      <!-- Load CSS -->
      <link rel="stylesheet" href="path_to_iife/assets/style.css" />

      <!-- Load JavaScript. Once loaded, the Trollbox web page will be embedded. -->
      <script src="path_to_iife/index.js" async></script>
      ```
    * Please ensure to replace path_to_iife with the actual path to the IIFE build artifacts of the SDK.

    * Should you wish to embed the interface dynamically, you have the flexibility to determine when to load the JavaScript file.

  * Use the `ESM` build products in a modern engineering project.

  ```typescript
  // Import the CSS file
  import 'groupfi-trollbox-sdk/dist/esm/assets/style.css';

  // Once imported, the Trollbox web page will be embedded.
  import trollboxSDK from 'groupfi-trollbox-sdk'
  ```

  * For dynamically embedding the Trollbox web page, such as within a click event handler, you can use the dynamic import() syntax like this:

    ```typescript
    // Import the CSS file
    import 'groupfi-trollbox-sdk/dist/esm/assets/style.css';

    function handleButtonClick() {
      // Once imported, the Trollbox web page will be embedded.
      import('groupfi-trollbox-sdk').then(trollboxSDKModule => {
        console.log('TrollboxSDK is ', trollboxSDKModule.default)
      }).catch(error => {
        console.error('Failed to load the Trollbox SDK:', error);
      })
    }

    ```

2. **Once the Trollbox web page is successfully embedded,** you can use the TrollboxSDK to enable communication between your Dapp and the Trollbox chat interface.
  * Ensure that the Trollbox web page is ready for communication.

    ```typescript
    # // Use the window.addEventListener method
    window.addEventListener('trollbox-ready', (event: CustomEvent) => {
      console.log(`Trollbox is ready with version: ${event.detail.trollboxVersion}`);
    });

    // Or, using the TrollboxSDK event emitter
    import TrollboxSDK from '@tanglepay.dev/groupfi-trollbox-sdk'

    TrollboxSDK.events.on('trollbox-ready', (data: { trollboxVersion: string }) => {
      console.log(`Trollbox is ready with version: ${data.trollboxVersion}`);
    });

    ```

  * Monitor Connection Status with GroupFi Trollbox.
    ```typescript
    import TrollboxSDK from '@tanglepay.dev/groupfi-trollbox-sdk';

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

  * Customize Recommended Groups.
    GroupFi Trollbox displays a set of default recommended groups to each user. Customize these groups as follows:

    ```typescript
    interface ErrorResponse {
      code: number;   // error code: 99999
      name: string;
      message: string;
      data?: any
    }

    interface SuccessResponse {}

    /**
    * Asynchronously sets the groups in the GroupFi Trollbox.
    * 
    * @param {Object} params An object containing the configuration for the groups.
    * @param {string[]} [params.includes] Optional. Array of group names to include.
    * @param {string[]} [params.excludes] Optional. Array of group names to exclude.
    */
    async function setForMeGroups({includes, excludes}:{includes?: string[], excludes?: string[]}) {
      try {
        const response: ErrorResponse | SuccessResponse = await TrollboxSDK.request({
          method: 'setForMeGroups',
          params: {
            includes, // Array of group names to include
            excludes  // Array of group names to exclude
          }
        });

        if ('code' in response && response.code === 99999) {
          console.error('Failed to set groups:', response.message);
        } else {
          console.log('Groups set successfully.');
        }

      } catch (error) {
        console.error('Failed to update groups:', error);
      }
    }
    
    ```












1. Ensuring Trollbox Ready

Before leveraging the capabilities of the GroupFi Trollbox SDK, make sure that the Trollbox is ready:

```typescript
# // Use the window.addEventListener method
window.addEventListener('trollbox-ready', (event: CustomEvent) => {
  console.log(`Trollbox is ready with version: ${event.detail.trollboxVersion}`);
});

// Or, using the TrollboxSDK event emitter
import TrollboxSDK from '@tanglepay.dev/groupfi-trollbox-sdk'

TrollboxSDK.events.on('trollbox-ready', (data: { trollboxVersion: string }) => {
  console.log(`Trollbox is ready with version: ${data.trollboxVersion}`);
});
```

2. Monitoring Connection Status with GroupFi Trollbox

To track the connection status of GroupFi Trollbox with the user's wallet:

```typescript
import TrollboxSDK from '@tanglepay.dev/groupfi-trollbox-sdk';

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
interface ErrorResponse {
  code: number;   // error code: 99999
  name: string;
  message: string;
  data?: any
}

interface SuccessResponse {}

/**
 * Asynchronously sets the groups in the GroupFi Trollbox.
 * 
 * @param {Object} params An object containing the configuration for the groups.
 * @param {string[]} [params.includes] Optional. Array of group names to include.
 * @param {string[]} [params.excludes] Optional. Array of group names to exclude.
 */
async function setForMeGroups({includes, excludes}:{includes?: string[], excludes?: string[]}) {
  try {
    const response: ErrorResponse | SuccessResponse = await TrollboxSDK.request({
      method: 'setForMeGroups',
      params: {
        includes, // Array of group names to include
        excludes  // Array of group names to exclude
      }
    });

    if ('code' in response && response.code === 99999) {
      console.error('Failed to set groups:', response.message);
    } else {
      console.log('Groups set successfully.');
    }

  } catch (error) {
    console.error('Failed to update groups:', error);
  }
}
```

