# GroupFi Chatbox SDK

The GroupFi Chatbox SDK provides an integration solution for Dapps to interact with the GroupFi Chatbox chat application. The primary functions of the SDK include:

1. Embed the GroupFi Chatbox web interface within the Dapp using an iframe.
2. Offer tools that facilitate communication between the Dapp and the GroupFi Chatbox chat.

## Installation
To incorporate the `groupfi-chatbox-sdk` into your project, execute one of the following commands in your project's root directory:


```sh
pnpm add groupfi-chatbox-sdk

# Or, if you're using NPM:
npm install groupfi-chatbox-sdk
```

## Usage
The GroupFi Chatbox SDK is provided in two build formats: IIFE and ESM, so you can choose the one that best fits your requirements.

1. Load the GroupFi Chatbox SDK Build Artifacts:

  * Use the `IIFE` build artifacts in pure JavaScript

      ```
      <!-- Load CSS -->
      <link rel="stylesheet" href="path_to_iife/assets/style.css" />

      <!-- Load JavaScript -->
      <script src="path_to_iife/index.js" async></script>
      ```

    * Please ensure to replace path_to_iife with the actual path to the IIFE build artifacts of the SDK.

  * Use the `ESM` build artifacts in a modern engineering project.

    ```typescript
    // Import the CSS file
    import 'groupfi-chatbox-sdk/dist/esm/assets/style.css';

    import ChatboxSDK from 'groupfi-chatbox-sdk'
    ```

2. After loading the Chatbox build artifacts, you can call the ChatboxSDK API to implement various functionalities.

  * `loadChatbox`: Embed the Chatbox interface

    ```typescript
    ChatboxSDK.loadChatbox(configs: {
      isBrowseMode: boolean
      provider?: any
      theme?: 'light' | 'dark'
    })
    ```
    Parameters:
    * `configs` (required): An object containing various configuration options for customizing the loading behavior of Chatbox.
      * `isBrowseMode` (required): Whether to load the Chatbox in 'Browse Mode'.
      * `provider` (optional): A Wallet Provider is an interface that allows Chatbox to interact with the MetaMask wallet. If it is in 'Browse Mode', the provider does not need to be set. However, if it is not in 'Browse Mode', the provider must be specified.
      * `theme` (optional): Specifies the theme style for Chatbox. Options include light (light theme) and dark (dark theme). If not provided, the default theme `light` will be used.

    * An example of integrating Chatbox with MetaMask wallet provider and dark theme.

      ```typescript
      ChatboxSDK.loadChatbox({
        isBrowseMode: false,
        provider: metaMaskProvider,
        theme: 'dark'
      })
      ```

    Note:
    * When executing `loadChatbox`, the Chatbox web page will only be embedded on a PC and not on a mobile device.
    * If the Chatbox is loaded successfully, you will be able to listen for the `chatbox-ready` event.
  
  * `chatbox-ready event`: Used to listen for events triggered by the Chatbox.
    The currently available event is:
    * `chatbox-ready`: Triggered when the Chatbox webpage has been successfully loaded. 

      ```typescript
      // Listen for the 'chatbox-ready' event to ensure that the Chatbox is ready for interaction.
      
      // Use window.addEventListener to listen for the 'chatbox-ready' event
      window.addEventListener('chatbox-ready', (event: CustomEvent<{
        chatboxVersion: string
      }>) => {
        console.log(`Chatbox is ready with version: ${event.detail.chatboxVersion}`);
      });

      // Alternatively, use ChatboxSDK's events.on to listen for the 'chatbox-ready' event
      ChatboxSDK.events.on('chatbox-ready', (data: { chatboxVersion: string }) => {
        console.log(`Chatbox is ready with version: ${data.chatboxVersion}`);
      });
      
      ```

      Note: 
      * **Most API calls, such as `dispatchMetaMaskAccountChanged` and `request`, must be executed after the `chatbox-ready` event has been detected. Only then is the Chatbox considered ready for interaction.**

  * `removeChatbox`: Remove the Chatbox interface
    ```typescript
    ChatboxSDK.removeChatbox()
    ```
    
  * `dispatchMetaMaskAccountChanged`: Used to specify the account that Chatbox should use. Whenever the wallet account used in the Dapp changes, this API needs to be called. 

    ```typescript
      /**
       * @param {object} data - The data object containing the account information.
       * @param {string} data.account - The new account address to be used by Chatbox.
       */
      ChatboxSDK.dispatchMetaMaskAccountChanged(data: {
        account: string
      })
    ```

    Note:
    * Ensure that the Chatbox is ready for interaction.
    * This is required only when using wallet types other than TanglePay.

  * `request`: Used to request Chatbox to perform certain operations. 

    Note:
    * Ensure that the Chatbox is ready for interaction.
  
  
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
      * `setForMeGroups`: Used to specify recommended groups for a Dapp

        ```typescript
        // Interface representing a group
        // groupName: Name of the group
        // chainId: Each EVM chain has a unique chainId. If it's not an EVM chain, chainId can be omitted.
        interface IGroup {
          groupName: string;
          chainId?: number
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

        An example of setting recommended groups in a Dapp

        ```typescript
          // The chainId for the Shimmer-EVM chain is 148
          ChatboxSDK.request({
            method: 'setForMeGroups',
            params: {
                // Groups to include in recommendations
                includes: [
                    {
                        groupName: 'Announcement',
                        chainId: 148
                    },
                    {
                        groupName: 'EtherVisions',
                        chainId: 148
                    },
                    {
                        groupName: 'TOKEN',
                        chainId: 148
                    }
                ],
                // Groups designated for announcements
                announcement: [
                    {
                        groupName: 'Announcement',
                        chainId: 148
                    }
                ]
            }
        })
        ```
