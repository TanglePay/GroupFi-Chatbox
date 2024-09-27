import { useState } from 'react'
import { classNames } from 'utils'
import {
  Powered,
  renderCeckRenderWithDefaultWrapper,
  TextWithSpinner
} from '../Shared'
import { useMessageDomain } from 'groupfi_chatbox_shared'
import TanglePayLogoSVG from 'public/icons/tanglepay-logo-1.svg'
import useEncryptionPublicKey from 'hooks/useEncryptionPublicKey'
import useSignature from 'hooks/useSignature'
import useUIConfig from 'hooks/useUIConfig'

export function Login() {
  const { messageDomain } = useMessageDomain()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const encryptionPublicKey = useEncryptionPublicKey()
  const signature = useSignature()

  if (signature) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Reseting account on chain..." />
    )
  }

  if (encryptionPublicKey) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Connecting..." />
    )
  }

  if (isLoggingIn) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text={'Connecting...'} />
    )
  }

  return (
    <div
      className={classNames(
        'w-full h-full flex flex-col justify-between overflow-auto'
      )}
    >
      <div className={classNames('flex-auto flex flex-col justify-evenly')}>
        <LogoAndTitle
          title="GroupFi Web3 Messaging"
          subTitle="Decentralized Chat, Unified Community"
        />
        <div className={classNames('px-5')}>
          <button
            className={classNames(`w-full h-12 bg-accent-500 rounded-xl`)}
            onClick={() => {
              messageDomain.login()
              setIsLoggingIn(true)
            }}
          >
            <span className={classNames('text-white')}>Connect</span>
          </button>
        </div>
      </div>
      <Powered />
    </div>
  )
}

export function Register() {
  const { messageDomain } = useMessageDomain()
  const [isRegistering, setIsRegistering] = useState<boolean>(false)

  const encryptionPublicKey = useEncryptionPublicKey()
  const signature = useSignature()
  // const [isEncryptionPublicKeySet, setIsEncryptionPublicKeySet] =
  //   useState<boolean>(false)
  // const [isSignatureSet, setIsSignatureSet] = useState<boolean>(false)

  // useEffect(() => {
  //   messageDomain.onLoginStatusChanged(() => {
  //     setIsEncryptionPublicKeySet(messageDomain.isEncryptionPublicKeySet())
  //     setIsSignatureSet(messageDomain.isSignatureSet())
  //   })
  // }, [])

  if (signature) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Registering account on chain..." />
    )
  }

  if (encryptionPublicKey) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Creating account..." />
    )
  }

  if (isRegistering) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Signing..." />
    )
  }

  return (
    <div
      className={classNames(
        'w-full h-full flex flex-col justify-between overflow-auto'
      )}
    >
      <div className={classNames('flex-auto flex flex-col justify-evenly')}>
        <LogoAndTitle
          title={'GroupFi Chatbox'}
          subTitle="Decentralized Chat, Unified Community"
        />
        <div className={classNames('px-5')}>
          <button
            className={classNames(
              'w-full h-12 bg-accent-600 dark:bg-accent-500 rounded-xl'
            )}
            onClick={() => {
              messageDomain.registerPairX()
              setIsRegistering(true)
            }}
          >
            <span className={classNames('text-white')}>Create Account</span>
          </button>
          <div
            className={classNames(
              'py-3 px-5 text-accent-600 dark:text-accent-500 text-center'
            )}
          >
            <button
              onClick={() => {
                messageDomain.setUserBrowseMode(true)
              }}
            >
              Browse as a guest
            </button>
          </div>
        </div>
      </div>
      <Powered />
    </div>
  )
}

function LogoAndTitle(props: { title: string; subTitle: string }) {
  const { title, subTitle } = props

  const uiConfig = useUIConfig()

  const [url, setUrl] = useState<string>(uiConfig?.logoUrl ?? TanglePayLogoSVG)

  const finalTitle = uiConfig?.title ?? title
  const finalSubTitle = uiConfig?.subTitle ?? subTitle

  return (
    <div className={classNames('flex flex-col items-center')}>
      <img
        onError={() => {
          setUrl(TanglePayLogoSVG)
        }}
        src={url}
        className={classNames('w-32 h-32 object-cover')}
      />
      <div className={classNames('text-center')}>
        <div className={classNames('font-bold text-primary text-2xl')}>
          {finalTitle}
        </div>
        <div className={classNames('pt-2 text-primary text-sm')}>
          {finalSubTitle}
        </div>
      </div>
    </div>
  )
}
