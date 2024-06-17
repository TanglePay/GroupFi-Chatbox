# GroupFi Chatbox SDK

GroupFi Chatbox SDK enables developers to easily integrate GroupFi's chatbox with their dApps on EVM chains through popular wallet extensions, including `MetaMask`, `OKX Wallet`, and `Trust Wallet`.

## Features
* Chatbox-dApp integration via an iframe.
* API's facilitating Chatbox-dApp interactions.

## Get started
For MetaMask SDK, please refer to [MetaMask SDK documentation](https://docs.metamask.io/wallet/how-to/use-sdk/). Other wallet SDKs' work similarly as the MetaMask SDK.

Install the Chatbox SDK in your project's root directory:
```sh
pnpm add groupfi-chatbox-sdk
```

or

```sh
npm install groupfi-chatbox-sdk
```

## Usage
The SDK is provided in two build formats: IIFE and ESM

To use the IIFE Build Artifacts in Pure JavaScript
1. Load the CSS:
    ```html
    <link rel="stylesheet" href="<path_to_iife>/assets/style.css" />
    ```
2. Load the JavaScript:
    ```html
    <script src="<path_to_iife>/index.js" async></script>
    ```

  Ensure to replace `<path_to_iife>` with the actual path to the IIFE build artifacts of the SDK.

To use the `ESM` build
1. Import the CSS file:
    ```typescript
    import 'groupfi-chatbox-sdk/dist/esm/assets/style.css';
    ```
2. Import the SDK:
    ```typescript
    import ChatboxSDK from 'groupfi-chatbox-sdk'
    ```
## API Usage
After importing the SDK, `loadChatbox` API can be called to embed the Chatbox interface

   * `loadChatbox`:
      ```typescript
      ChatboxSDK.loadChatbox(configs: {
        isWalletConnected: boolean
        provider?: any
        theme?: 'light' | 'dark'
      })
      ```
      Parameters:
      * `configs` (required): An object containing various configuration options
        * `isWalletConnected` (required): Whether the wallet is connected with the Chatbox.
        * `provider` (required if `isWalletConnected` is `true`): A Wallet Provider is an interface that allows Chatbox to interact with the wallet. If a wallet is connected, a provider must be provided.
        * `theme` (optional): specifies the theme style for Chatbox. Options include light (light theme) and dark (dark theme). Default theme `light`.

      Example:
        ```typescript
        ChatboxSDK.loadChatbox({
          isWalletConnected: false,
          provider: provider,
          theme: 'dark'
        })
        ```
      Note `loadChatbox` currently only support Chatbox embedding on a PC but not on a mobile device.

      Listen to the `chatbox-ready` event triggered by the chatbox to check if the Chatbox has been successfully loaded. Only then is the Chatbox ready for interaction.

      1. Using `window.addEventListener`:

            ```typescript
            window.addEventListener('chatbox-ready', (event: CustomEvent<{
              chatboxVersion: string
            }>) => {
              console.log(`Chatbox is ready with version: ${event.detail.chatboxVersion}`);
            });
            ```
      2. Using `ChatboxSDK.events.on`:
            ```typescript
            ChatboxSDK.events.on('chatbox-ready', (data: { chatboxVersion: string }) => {
              console.log(`Chatbox is ready with version: ${data.chatboxVersion}`);
            });
            
            ```
You can copy the full Pure JavaScript example to get started:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroupFi Chatbox SDK</title>
  <!-- Load CSS for GroupFi Chatbox SDK -->
  <link rel="stylesheet" href="/node_modules/groupfi-chatbox-sdk/dist/esm/assets/style.css" />
</head>
<body>
  <h1>GroupFi Chatbox - Metamask Integration</h1>
  <button onclick="connect()">Connect</button>

  <!-- MetaMask SDK -->
  <script src="/node_modules/@metamask/sdk/dist/browser/iife/metamask-sdk.js"></script>
  <!-- GroupFi Chatbox SDK -->
  <script src="/node_modules/groupfi-chatbox-sdk/dist/iife/index.js" async></script>

  <script>
    // Initialize MetaMask SDK
    const sdk = new MetaMaskSDK.MetaMaskSDK({
      dappMetadata: {
        name: "Pure JS example",
        url: window.location.host,
      },
      logging: {
        sdk: false,
      }
    });

    let provider;

    // Connect to MetaMask
    function connect() {
      sdk.connect()
        .then((res) => {
          provider = sdk.getProvider();
          // Load the Chatbox
          ChatboxSDK.loadChatbox({
            isWalletConnected: true,
            provider: provider,
            theme: 'dark'
          });
        })
        .catch((e) => console.log('request accounts ERR', e));
    }

    // Listen for the 'chatbox-ready' event to ensure that the Chatbox is ready for interaction
    window.addEventListener('chatbox-ready', function(event) {
      console.log(`Chatbox is ready with version: ${event.detail.chatboxVersion}`);
    });

    // Alternatively, use ChatboxSDK's events.on to listen for the 'chatbox-ready' event
    ChatboxSDK.events.on('chatbox-ready', function(data) {
      console.log(`Chatbox is ready with version: ${data.chatboxVersion}`);
    });
  </script>
</body>
</html>
```

Additional API's after the Chatbox has been successfully loaded:

  * `removeChatbox`: Remove Chatbox from dApp.
    ```typescript
    ChatboxSDK.removeChatbox()
    ```

  * `processAccount`: Specify which account to interact with, to be called on startup or after switching accounts within the same wallet. 

    ```typescript
      /**
       * @param {object} data - The data object containing the account information.
       * @param {string} data.account - The new account address to be used by Chatbox.
       */
      ChatboxSDK.dispatchAccountChanged(data: {
        account: string
      })
    ```
  Note:
  * After `loadChatbox`, `processAccount` is required if the wallet is in a connected state.
  * When connecting, disconnecting, or switching wallets, `removeChatbox` needs to be called first, followed by `loadChatbox`.

  Based on the above points, here are specific scenarios:

  Starting the Chatbox:
  * If the wallet is already connected at startup, call `loadChatbox`, followed by `processAccount`.
  * If the wallet is not connected at startup, call `loadChatbox` with `isWalletConnected = false` to enter guest mode.

  After the Chatbox has started, when the user performs the following actions:
  * Connect wallet: first call `removeChatbox`, then restart the Chatbox by calling `loadChatbox`, followed by `processAccount`.
  * Disconnect wallet: first call `removeChatbox`, then restart the Chatbox by calling `loadChatbox` with `isWalletConnected = false`.
  * Switch to a different wallet (e.g. from `MetaMask` to `OKX Wallet`): first call `removeChatbox`, then restart the Chatbox by calling `loadChatbox` with a new `provider`, followed by `processAccount` with a new account address.
  * Switch accounts within the wallet: simply call `processAccount` with a new account address.

  `request`: Request Chatbox to perform certain operations. 
  
    ```typescript
      /**
       * @param {object} data - The data object containing the method and parameters for the request.
       * @param {string} data.method - The method name of the operation to be performed by Chatbox.
       * @param {Object} data.params - The parameters needed for the method.
       */
      ChatboxSDK.request(data: {
        method: string,
        params: any
      })
    ```

    Supported methods currently include:
      * `setForMeGroups`: Used to specify recommended groups for a dApp

        ```typescript
        // Interface representing a group
        // Each group is represented by a unique identifier `groupId`.
        interface IGroup {
          groupId: string
        }

        /**
         * Request to set recommended groups for the user's Dapp.
        * @param {object} data - The data object containing the method and parameters for the request.
        * @param {string} data.method - The method name ('setForMeGroups').
        * @param {object} data.params - The parameter object for this method.
        * @param {IGroup[]} [data.params.includes] - Groups to include in recommendations.
        * @param {IGroup[]} [data.params.excludes] - Groups to exclude from all groups.
        * @param {IGroup[]} [data.params.announcement] - Groups to mark as announcement groups. The announcement group has a special style.
        */
        ChatboxSDK.request({
          method: 'setForMeGroups',
          params: {
            includes?: IGroup[],
            excludes?: IGroup[],
            announcement?: IGroup[]
          }
        })
        ```

        Example:

        ```typescript
          // The chainId for the Shimmer-EVM chain is 148
          ChatboxSDK.request({
            method: 'setForMeGroups',
            params: {
                // Groups to include in recommendations
                includes: [
                    {
                        groupId: 'groupfiERC20GroupTestfish02e82c7ad624e3cf9fd5506ac4ff9a5a10bfd642838457858a5f1d5864c8e4ac'
                    },
                ],
                // Groups designated for announcements
                announcement: [
                    {
                        groupId: 'groupfiERC20GroupTestfish02e82c7ad624e3cf9fd5506ac4ff9a5a10bfd642838457858a5f1d5864c8e4ac'
                    }
                ]
            }
        })
        ```