import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper, Spinner } from 'components/Shared'
import { useEffect, createContext, useState } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor, classNames } from 'utils'
import { SWRConfig } from 'swr'

import { useAppDispatch, useAppSelector } from './redux/hooks'
import { setForMeGroups, setIncludes } from './redux/forMeGroupsSlice'
import { setMyGroups } from './redux/myGroupsSlice'

// import { SDKReceiver, SDKHandler } from './sdk'
import sdkReceiver from './sdk'

import './App.scss'

// Not check cash token and public key in development env
const isProd = import.meta.env.MODE !== 'development'

const router = createBrowserRouter([
  {
    path: '/',
    async lazy() {
      const Component = (await import('./components/GroupList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id',
    async lazy() {
      const Component = (await import('./components/ChatRoom')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/info',
    async lazy() {
      const Component = (await import('./components/GroupInfo')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('./components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'user/:id',
    async lazy() {
      const Component = (await import('./components/UserInfo')).default
      return { Component }
    }
  }
])

export const AppInitedContext = createContext({
  inited: false
})

function App() {
  const { messageDomain } = useMessageDomain()

  const [address, setAddress] = useState<string | undefined>(undefined)

  const appDispatch = useAppDispatch()

  useLoadForMeGroupsAndMyGroups(address)

  const [hasEnoughCashToken, hasPublicKey] =
    useCheckCashTokenAndPublicKey(address)

  const fn = async () => {
    const addr = await messageDomain.connectWallet()
    await messageDomain.setupGroupFiMqttConnection(connect)
    const adapter = new LocalStorageAdaptor()
    messageDomain.setStorageAdaptor(adapter)

    messageDomain.listenningAccountChanged((newAddress: string) => {
      setAddress(newAddress)
    })
    await messageDomain.getGroupFiService().setupIotaMqttConnection(MqttClient)

    setAddress(addr)

    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
  }

  const initSDK = () => {
    // const sdkHandler = new SDKHandler(appDispatch)
    // const sdkReceiver = new SDKReceiver(sdkHandler)
    return sdkReceiver.listenningMessage()
  }

  useEffect(() => {
    fn()

    const stopListenningSDKMessage = initSDK()
    return stopListenningSDKMessage
  }, [])

  return (
    <SWRConfig value={{}}>
      <AppInitedContext.Provider
        value={{
          inited: address !== undefined
        }}
      >
        <AppWrapper>
          {/* {!hasEnoughCashToken || !hasPublicKey ? (
            <CashTokenAndPublicKeyCheckRender
              hasEnoughCashToken={hasEnoughCashToken}
              hasPublicKey={hasPublicKey}
            />
          ) : (
            <RouterProvider
              router={router}
              fallbackElement={<p>Loading...</p>}
            ></RouterProvider>
          )} */}
          <RouterProvider
            router={router}
            fallbackElement={<p>Loading...</p>}
          ></RouterProvider>
        </AppWrapper>
      </AppInitedContext.Provider>
    </SWRConfig>
  )
}

function useCheckCashTokenAndPublicKey(
  address: string | undefined
): [boolean | undefined, boolean | undefined] {
  const { messageDomain } = useMessageDomain()

  const [hasEnoughCashToken, setHasEnoughCashToken] = useState<
    boolean | undefined
  >(undefined)

  const [hasPublicKey, setHasPublicKey] = useState<boolean | undefined>(
    undefined
  )

  useEffect(() => {
    if (address !== undefined) {
      setHasEnoughCashToken(undefined)
      setHasPublicKey(undefined)
      const off1 = messageDomain.onHasEnoughCashTokenOnce(() => {
        setHasEnoughCashToken(true)
      })
      const off2 = messageDomain.onNotHasEnoughCashTokenOnce(() => {
        setHasEnoughCashToken(false)
      })
      const off3 = messageDomain.onAquiringPublicKeyOnce(() => {
        setHasPublicKey(false)
      })
      const off4 = messageDomain.onIsHasPublicKeyChangedOnce(() => {
        setHasPublicKey(true)
      })

      return () => {
        off1()
        off2()
        off3()
        off4()
      }
    }
  }, [address])

  return [hasEnoughCashToken, hasPublicKey]
}

function CashTokenAndPublicKeyCheckRender(props: {
  hasEnoughCashToken: boolean | undefined
  hasPublicKey: boolean | undefined
}) {
  const { hasEnoughCashToken, hasPublicKey } = props
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-row items-center justify-center'
      )}
    >
      {hasEnoughCashToken === undefined ? (
        <>
          <Spinner />
        </>
      ) : hasEnoughCashToken ? (
        hasPublicKey === undefined ? (
          <>
            <Spinner />
          </>
        ) : !hasPublicKey ? (
          <>
            <Spinner />
            <div className={classNames('mt-1')}>Creating public key</div>
          </>
        ) : null
      ) : (
        <div className="font-medium">
          You should have at least
          <br />
          <span className={classNames('text-sky-500')}>10 SMR</span> in your
          account
        </div>
      )}
    </div>
  )
}

function useLoadForMeGroupsAndMyGroups(address: string | undefined) {
  const includes = useAppSelector((state) => state.forMeGroups.includes)
  const excludes = useAppSelector((state) => state.forMeGroups.excludes)

  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()

  const loadForMeGroupList = async (params: {
    includes?: string[]
    excludes?: string[]
  }) => {
    const forMeGroups = await messageDomain
      .getGroupFiService()
      .getRecommendGroups(params)
    console.log('===>forMeGroups', forMeGroups)
    appDispatch(setForMeGroups(forMeGroups))
  }

  const loadMyGroupList = async () => {
    console.log('===>Enter myGroups request')
    const myGroups = await messageDomain.getGroupFiService().getMyGroups()
    console.log('===>myGroups', myGroups)
    appDispatch(setMyGroups(myGroups))
  }

  useEffect(() => {
    if (address) {
      loadForMeGroupList({ includes, excludes })
    }
  }, [address, includes, excludes])

  useEffect(() => {
    if (address) {
      loadMyGroupList()
    }
  }, [address])
}

export default App
