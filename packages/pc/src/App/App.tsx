import { useCallback, useEffect, useRef, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../redux/hooks'
import { GroupInfo } from 'redux/types'
import { setForMeGroups } from '../redux/forMeGroupsSlice'
import { setMyGroups } from '../redux/myGroupsSlice'
import {
  TanglePayWallet,
  MetaMaskWallet,
  useMessageDomain,
  Mode,
  ShimmerMode,
  ImpersonationMode,
  DelegationMode,
  IIncludesAndExcludes
} from 'groupfi_chatbox_shared'
import {
  renderCeckRenderWithDefaultWrapper,
  AppLoading
} from 'components/Shared'
import SMRPurchase from '../components/SMRPurchase'
import { Register, Login } from 'components/RegisterAndLogin'
import { setUserProfile } from '../redux/appConfigSlice'

import { AppNameAndCashAndPublicKeyCheck, AppWalletCheck } from './AppCheck'
import {
  useCheckBalance,
  useCheckNicknameNft,
  useCheckPublicKey,
  useCheckIsHasPairX,
  useCheckDelegationModeNameNft
} from './hooks'

const router = createBrowserRouter([
  {
    path: '/',
    async lazy() {
      const Component = (await import('../components/GroupList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id',
    async lazy() {
      const Component = (await import('../components/ChatRoom')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('../components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/info',
    async lazy() {
      const Component = (await import('../components/GroupInfo')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('../components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'user/:id',
    async lazy() {
      const Component = (await import('../components/UserInfo')).default
      return { Component }
    }
  }
])

function AppRouter() {
  return (
    <RouterProvider
      router={router}
      fallbackElement={<p>Loading...</p>}
    ></RouterProvider>
  )
}

export function AppWithWalletType(props: {
  walletType: typeof TanglePayWallet | typeof MetaMaskWallet
  metaMaskAccountFromDapp: string | undefined
}) {
  const { walletType, metaMaskAccountFromDapp } = props

  const { messageDomain } = useMessageDomain()

  const [walletInstalled, setWalletInstalled] = useState<boolean | undefined>(
    undefined
  )

  const [walletConnected, setWalletConnected] = useState<boolean | undefined>(
    undefined
  )

  const [nodeId, setNodeId] = useState<number | undefined>(undefined)

  const [modeAndAddress, setModeAndAddress] = useState<
    { mode: Mode; address: string } | undefined
  >(undefined)

  const connectWallet = async () => {
    try {
      const res = await messageDomain.connectWallet(
        walletType,
        metaMaskAccountFromDapp
      )

      setWalletInstalled(true)
      setWalletConnected(true)
      setModeAndAddress({
        mode: res.mode,
        address: res.address
      })
      setNodeId(res.nodeId)
    } catch (error: any) {
      if (error.name === 'TanglePayUnintalled') {
        setWalletInstalled(false)
      }
      if (error.name === 'MetaMaskUnintalled') {
        setWalletInstalled(false)
      }
      if (error.name === 'TanglePayConnectFailed') {
        setWalletConnected(false)
      }
      if (error.name === 'MetaMaskConnectFailed') {
        setWalletConnected(false)
      }
    }
  }

  const fn = async () => {
    await connectWallet()

    const listener = async ({
      address,
      mode,
      nodeId
    }: {
      address: string
      mode: Mode
      nodeId?: number
    }) => {
      setNodeId(nodeId)
      setModeAndAddress((prev) => {
        if (prev?.address !== address || prev?.mode !== mode) {
          return {
            address,
            mode
          }
        }
        return prev
      })
    }

    let stopListenner: undefined | (() => void) = undefined

    if (walletType === TanglePayWallet) {
      stopListenner = messageDomain.listenningTPAccountChanged(listener)
    }

    return () => {
      if (stopListenner) {
        stopListenner()
      }
    }
  }

  const onMetaMaskAccountChanged = async (newAccount: string) => {
    await messageDomain.onMetaMaskAccountChanged(newAccount)
    setModeAndAddress({
      address: newAccount,
      mode: DelegationMode
    })
  }

  useEffect(() => {
    if (
      metaMaskAccountFromDapp !== undefined &&
      modeAndAddress !== undefined &&
      modeAndAddress.address !== metaMaskAccountFromDapp
    ) {
      onMetaMaskAccountChanged(metaMaskAccountFromDapp)
    }
  }, [metaMaskAccountFromDapp])

  useEffect(() => {
    fn()
  }, [walletType])

  const isCheckPassed = walletInstalled && walletConnected

  if (!isCheckPassed) {
    return renderCeckRenderWithDefaultWrapper(
      <AppWalletCheck
        walletType={walletType}
        walletInstalled={walletInstalled}
        walletConnected={walletConnected}
      />
    )
  }

  if (!modeAndAddress) {
    return <AppLoading />
  }

  if (
    metaMaskAccountFromDapp !== undefined &&
    modeAndAddress.address !== metaMaskAccountFromDapp
  ) {
    return <AppLoading />
  }

  return (
    <AppLaunch
      mode={modeAndAddress.mode}
      address={modeAndAddress.address}
      nodeId={nodeId}
    />
  )
}

interface AppLaunchWithAddressProps {
  address: string
  mode: Mode
  nodeId?: number
}

export function AppLaunch(props: AppLaunchWithAddressProps) {
  const { messageDomain } = useMessageDomain()
  const [inited, setInited] = useState(false)

  const clearUp = async () => {
    try {
      await messageDomain.pause()
      await messageDomain.stop()
      await messageDomain.destroy()
    }catch(error) {
      console.log('AppLaunch clearUp error', error)
    }
  }

  const startup = async () => {
    await clearUp()

    await messageDomain.bootstrap()
    setInited(true)
  }

  useEffect(() => {
    startup()
    return () => {
      console.log('AppLaunch unmount')
    }
  }, [])

  if (!inited) {
    return <AppLoading />
  }

  return <AppLaunchAnAddress {...(props as AppLaunchWithAddressProps)} />
}

export function AppLaunchBrowseMode() {
  const { messageDomain } = useMessageDomain()
  const [inited, setInited] = useState<boolean>(false)

  const startup = async () => {
    await messageDomain.browseModeSetupClient()
    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
    messageDomain.setUserBrowseMode(true)
    setInited(true)
  }

  const clearUp = async () => {
    await messageDomain.pause()
    await messageDomain.stop()
    await messageDomain.destroy()
  }

  useEffect(() => {
    startup()

    return () => {
      clearUp()
    }
  }, [])

  if (!inited) {
    return <AppLoading />
  }

  return <AppRouter />
}

function AppLaunchAnAddress(props: {
  address: string
  mode: Mode
  nodeId?: number
}) {
  const { mode, address, nodeId } = props
  const { messageDomain } = useMessageDomain()

  
  const [inited, setInited] = useState<boolean>(false)

  const startup = async () => {
    messageDomain.setWalletAddress(address)
    await messageDomain.setStorageKeyPrefix(address)

    await messageDomain.start()
    await messageDomain.resume()
    setInited(true)
  }

  useEffect(() => {
    setInited(false)
    startup()
    return () => {
      console.log('AppLaunchAnAddress unmount')
    }
  }, [address, mode])

  if (!inited) {
    return <AppLoading />
  }

  if (mode === ShimmerMode) {
    return <AppShimmerMode address={address} />
  }

  if (mode === ImpersonationMode) {
    return <AppImpersonationMode address={address} nodeId={nodeId} />
  }

  if (mode === DelegationMode) {
    return <AppDelegationModeCheck address={address} />
  }
}

function AppShimmerMode(props: { address: string }) {
  const { address } = props

  const hasEnoughCashToken = useCheckBalance(address)
  const hasPublicKey = useCheckPublicKey(address)
  const [mintProcessFinished, onMintFinish] = useCheckNicknameNft(address)

  const isCheckPassed =
    hasEnoughCashToken && hasPublicKey && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={hasPublicKey}
        mode={ShimmerMode}
      />
    )
  ) : (
    <AppRouter />
  )
}

function AppImpersonationMode(props: {
  address: string
  nodeId: number | undefined
}) {
  const { messageDomain } = useMessageDomain()
  const { address, nodeId } = props

  const [isRegistered, setIsRegistered] = useState<boolean | undefined>(
    undefined
  )

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(undefined)

  const hasEnoughCashToken = useCheckBalance(address)

  const [mintProcessFinished, onMintFinish] = useCheckNicknameNft(address)

  const callback = useCallback(() => {
    const isRegistered = messageDomain.isRegistered()
    setIsRegistered(isRegistered)
    const isLoggedIn = messageDomain.isLoggedIn()
    setIsLoggedIn(isLoggedIn)
    // const isBrowseMode = messageDomain.isUserBrowseMode()
    // setIsBrowseMode(isBrowseMode)
  }, [])

  useEffect(() => {
    // TODO call callback to get the initial value
    messageDomain.onLoginStatusChanged(callback)
    // messageDomain.onNameChanged(nameCallback)
    callback()
    // nameCallback()
    return () => {
      messageDomain.offLoginStatusChanged(callback)
      // messageDomain.offNameChanged(nameCallback)
    }
  }, [])
  

  console.log('===> isLoggedIn', isLoggedIn)

  if (isRegistered === undefined) {
    return <AppLoading />
  }

  if (!isRegistered) {
    return <SMRPurchase nodeId={nodeId} address={address} />
  }

  if (isLoggedIn === undefined) {
    return <AppLoading />
  }

  if (!isLoggedIn) {
    return <Login />
  }

  
  // return <AppLoading />

  // const isHasPairX = useCheckIsHasPairX(address)

  // const hasEnoughCashToken = useCheckBalance(address)

  

  // if (isHasPairX === false && hasEnoughCashToken === false) {
  //   return <SMRPurchase nodeId={nodeId} address={address} />
  // }

  // if (!isHasPairX) {
  //   return <AppLoading />
  // }

  const isCheckPassed = hasEnoughCashToken && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={true}
        mode={ImpersonationMode}
      />
    )
  ) : (
    <AppRouter />
  )
}

function AppDelegationModeCheck(props: { address: string }) {
  const { address } = props
  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()

  const [isRegistered, setIsRegistered] = useState<boolean | undefined>(
    undefined
  )

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(undefined)

  const [isBrowseMode, setIsBrowseMode] = useState<boolean>(false)

  const hasEnoughCashToken = useCheckBalance(address)

  const [name, setName] = useState<string | undefined>(undefined)

  const callback = useCallback(() => {
    const isRegistered = messageDomain.isRegistered()
    setIsRegistered(isRegistered)
    const isLoggedIn = messageDomain.isLoggedIn()
    setIsLoggedIn(isLoggedIn)
    const isBrowseMode = messageDomain.isUserBrowseMode()
    setIsBrowseMode(isBrowseMode)
  }, [])

  const nameCallback = useCallback(() => {
    const name = messageDomain.getName()
    setName(name)
    if (!!name) {
      appDispatch(setUserProfile({ name }))
    }
  }, [])

  useEffect(() => {
    // TODO call callback to get the initial value
    messageDomain.onLoginStatusChanged(callback)
    messageDomain.onNameChanged(nameCallback)
    callback()
    nameCallback()
    return () => {
      messageDomain.offLoginStatusChanged(callback)
      messageDomain.offNameChanged(nameCallback)
    }
  }, [])

  if (isRegistered === undefined) {
    return <AppLoading />
  }

  if (!isRegistered && !isBrowseMode) {
    return <Register />
  }

  if (isBrowseMode) {
    return <AppRouter />
  }

  if (isLoggedIn === undefined) {
    return <AppLoading />
  }

  if (!isLoggedIn && !isBrowseMode) {
    return <Login />
  }

  if (!isBrowseMode && name === undefined) {
    return <AppLoading />
  }

  const isCheckPassed = hasEnoughCashToken && (!!name || isBrowseMode)

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={() => {}}
        mintProcessFinished={!!name}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={true}
        mode={DelegationMode}
      />
    )
  ) : (
    <AppRouter />
  )
}

function useLoadForMeGroupsAndMyGroups(address: string) {
  const includes = useAppSelector((state) => state.forMeGroups.includes)
  const excludes = useAppSelector((state) => state.forMeGroups.excludes)

  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()

  const loadForMeGroupList = async (params: {
    includes?: IIncludesAndExcludes[]
    excludes?: IIncludesAndExcludes[]
  }): Promise<GroupInfo[]> => {
    const forMeGroups = await messageDomain.getGroupfiServiceRecommendGroups(
      params
    )

    // let groups: GroupInfo[] = forMeGroups

    // if (params.includes !== undefined) {
    //   const sortedForMeGroups: GroupInfo[] = []
    //   params.includes.map(({ groupName }) => {
    //     const index = forMeGroups.findIndex(
    //       (group: GroupInfo) => group.groupName === groupName
    //     )
    //     if (index > -1) {
    //       sortedForMeGroups.push(forMeGroups[index])
    //     }
    //   })
    //   groups = sortedForMeGroups
    // }

    appDispatch(setForMeGroups(forMeGroups))
    return forMeGroups
  }

  const loadMyGroupList = async () => {
    const myGroups = await messageDomain.getGroupFiService().getMyGroups()
    appDispatch(setMyGroups(myGroups))
  }

  useEffect(() => {
    if (address) {
      appDispatch(setForMeGroups(undefined))
      ;(async () => {
        const groups = await loadForMeGroupList({ includes, excludes })
        if (groups.length === 1) {
          router.navigate(
            `/group/${groups[0].groupId}?home=true&announcement=true`
          )
        } else {
          router.navigate('/')
        }
      })()
    }
  }, [address, includes, excludes])

  useEffect(() => {
    if (address) {
      loadMyGroupList()
    }
  }, [address])
}
