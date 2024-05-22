import { useEffect, useState } from 'react'
import { classNames } from 'utils'
import { renderCeckRenderWithDefaultWrapper, Spinner } from '../Shared'
import { useMessageDomain } from 'groupfi_trollbox_shared'

export function Login() {
  const { messageDomain } = useMessageDomain()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  if (isLoggingIn) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text={'Connecting...'} />
    )
  }

  return renderCeckRenderWithDefaultWrapper(
    <div className={classNames('w-full')}>
      <div className={classNames('text-center')}>
        <div className={classNames('font-medium text-[#333]')}>
          GroupFi Web3 Messaging
        </div>
        <div className={classNames('pt-2')}>
          Decentralized Chat & Unified Community
        </div>
      </div>
      <div className={classNames('px-5 mt-24')}>
        <button
          className={classNames('w-full h-12 bg-[#3671EE] rounded-xl')}
          onClick={() => {
            messageDomain.login()
            setIsLoggingIn(true)
          }}
        >
          <span className={classNames('text-white')}>Connect</span>
        </button>
      </div>
    </div>
  )
}

function TextWithSpinner(props: { text: string }) {
  return (
    <div className={classNames('mt-1')}>
      <div className={classNames('flex justify-center mt-2')}>
        <Spinner />
      </div>
      {props.text}
    </div>
  )
}

export function Register(props: {
  onEnterBrowseMode: () => void
}) {
  const { messageDomain } = useMessageDomain()
  const [isRegistering, setIsRegistering] = useState<boolean>(false)
  const [isEncryptionPublicKeySet, setIsEncryptionPublicKeySet] =
    useState<boolean>(false)
  const [isSignatureSet, setIsSignatureSet] = useState<boolean>(false)

  useEffect(() => {
    messageDomain.onLoginStatusChanged(() => {
      setIsEncryptionPublicKeySet(messageDomain.isEncryptionPublicKeySet())
      setIsSignatureSet(messageDomain.isSignatureSet())
    })
  }, [])

  if (isSignatureSet) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Registering account on chain..." />
    )
  }

  if (isEncryptionPublicKeySet) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Signing..." />
    )
  }

  if (isRegistering) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Creating account..." />
    )
  }

  return renderCeckRenderWithDefaultWrapper(
    <div className={classNames('w-full')}>
      <div className={classNames('text-center')}>
        <div className={classNames('font-medium text-[#333]')}>
          GroupFi Web3 Messaging
        </div>
        <div className={classNames('pt-2')}>
          Decentralized Chat & Unified Community
        </div>
      </div>
      <div className={classNames('px-5 mt-24')}>
        <button
          className={classNames('w-full h-12 bg-[#3671EE] rounded-xl')}
          onClick={() => {
            messageDomain.registerPairX()
            setIsRegistering(true)
          }}
        >
          <span className={classNames('text-white')}>Create Account</span>
        </button>
      </div>
      <div className={classNames('py-3 px-5 text-[#3671EE] text-right')}>
        <button>Browse as a guest</button>
      </div>
    </div>
  )
}
