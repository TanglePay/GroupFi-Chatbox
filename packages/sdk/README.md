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

1. **Embed the GroupFi Trollbox Web Page in your Dapp:**

  * Use the `IIFE` build products.

      ```
      <!-- Load CSS -->
      <link rel="stylesheet" href="path_to_iife/assets/style.css" />

      <!-- Load JavaScript. Once loaded, the Trollbox web page will be embedded. -->
      <script src="path_to_iife/index.js" async></script>
      ```

      To verify that the Trollbox is ready for interaction, you can listen for the 'trollbox-ready' event. 
      ```typescript
      // Listen for the 'trollbox-ready' event to ensure that the Trollbox is prepared for communication.
      window.addEventListener('trollbox-ready', (event: CustomEvent<{
        trollboxVersion: string
      }>) => {
        console.log(`Trollbox is ready with version: ${event.detail.trollboxVersion}`);
      });
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

    To verify that the Trollbox is ready for interaction, you can listen for the 'trollbox-ready' event. 

    ```typescript
    // Listen for the 'trollbox-ready' event to ensure that the Trollbox is prepared for communication.
    TrollboxSDK.events.on('trollbox-ready', (data: { trollboxVersion: string }) => {
      console.log(`Trollbox is ready with version: ${data.trollboxVersion}`);
    });
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
    // Use the window.addEventListener method
    window.addEventListener('trollbox-ready', (event: CustomEvent<{
      trollboxVersion: string
    }>) => {
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
        // If you're using the GroupFi Trollbox Dapp as a sign-in gateway,
        // the Dapp needs to determine the user's sign-in status and handle account switching
        // based on the wallet connection status provided by the Trollbox Dapp.
        console.log('Wallet connected:', data.walletConnectData);
      } else {
        // Wallet connection failed; potential reasons include:
        // 1. The wallet is not installed.
        // 2. A wallet not supported by GroupFi Trollbox is in use; currently, GroupFi Trollbox only supports the TanglePay Wallet.
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

    * To customize the display of Chat Groups using setForMeGroups, you would need to call this method during the initial loading of your application to present specific groups rather than the default ones. Also, if you want to set different Chat Groups for different pages of your website, you should invoke the setForMeGroups method each time a page switch occurs.

    * To demonstrate how to customize Groups by showcasing which recommended Groups a specific user can view:

      * Each user, due to owning different NFTs and asset quantities, is recommended different Groups by default. These can be obtained through the method below:

        ```typescript
        // User SMR Address
        const userAddrss = 'smr1qqc9fkdqy2esmnnqkv3aylvalz05vjkfd0368hgjy3f2nfp4dvdk67a3xdt'

        interface GroupInfo {
          groupName: string,
          chainName: string,
          qualifyType: number
          collectionIds: string[]
          tokenThres: string
        }

        // Method to retrieve the user's default groups
        const async getuserDefaultGroups() {
          // Send a POST request to this URL
          const { data: userDefaultGroups } = await axios.post<GroupInfo[]>(`https://prerelease.api.iotacat.com/api/groupfi/v1/addressqualifiedgroupconfigs?address=${userAddrss}`
        }

        ```

        * This will yield the default Groups for a user in the following format:
          ```json
          [
            {
                "groupName": "iceberg-3",
                "chainName": "smr",
                "qualifyType": "nft",
                "collectionIds": [
                    "0x4136c04d4bc25011f5b03dc9d31f4082bc7c19233cfeb2803aef241b1bb29c92"
                ],
                "tokenThres": ""
            },
            {
                "groupName": "iceberg-4",
                "chainName": "smr",
                "qualifyType": "nft",
                "collectionIds": [
                    "0x6ba06fb2371ec3615ff45667a152f729e2c9a24643f4e26e06b297def1e9c4bf"
                ],
                "tokenThres": ""
            }
          ]
          ```
    
        * If a Dapp page is designed so that all users should only see the 'iceberg-3' Group, call setForMeGroups before entering this page:
        
          ```typescript
          
          window.onload = function() {
            setForMeGroups({includes: ['iceberg-3']})
          }

          ```















