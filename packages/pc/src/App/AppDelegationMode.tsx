import { useCallback, useEffect, useState, lazy } from 'react'
import { useMessageDomain } from 'groupfi-sdk-chat'
import { renderCeckRenderWithDefaultWrapper, AppLoading } from 'components/Shared'
import { AppNameAndCashAndPublicKeyCheck } from './AppCheck'
import { AppRouter } from './App'
import useProfile from 'hooks/useProfile'
import { DelegationMode } from 'groupfi-sdk-chat'

const Login = lazy(() => import('../components/RegisterAndLogin/Login'))
const Register = lazy(() => import('../components/RegisterAndLogin/Register'))

export default function AppDelegationMode(props: { address: string }) {
  const { messageDomain } = useMessageDomain()

  const [isRegistered, setIsRegistered] = useState<boolean | undefined>(
    messageDomain.isRegistered()
  )

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(
    messageDomain.isLoggedIn()
  )

  const [isBrowseMode, setIsBrowseMode] = useState<boolean>(
    messageDomain.isUserBrowseMode()
  )

  const profile = useProfile()

  const callback = useCallback(() => {
    const isRegistered = messageDomain.isRegistered()
    setIsRegistered(isRegistered)
    const isLoggedIn = messageDomain.isLoggedIn()
    setIsLoggedIn(isLoggedIn)
    const isBrowseMode = messageDomain.isUserBrowseMode()
    setIsBrowseMode(isBrowseMode)
  }, [])

  useEffect(() => {
    // TODO call callback to get the initial value
    messageDomain.onLoginStatusChanged(callback)
    // messageDomain.onNameChanged(nameCallback)
    // callback()
    // nameCallback()
    return () => {
      messageDomain.offLoginStatusChanged(callback)
      // messageDomain.offNameChanged(nameCallback)
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

  if (!isBrowseMode && profile === undefined) {
    return <AppLoading />
  }

  const isCheckPassed = !!profile || isBrowseMode

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={() => {}}
        mintProcessFinished={!!profile}
        hasEnoughCashToken={true}
        hasPublicKey={true}
        mode={DelegationMode}
      />
    )
  ) : (
    <AppRouter />
  )
}
