import { useState } from 'react'
import { classNames } from 'utils'
import {
  Powered,
  renderCeckRenderWithDefaultWrapper,
  TextWithSpinner
} from '../Shared'
import { useMessageDomain } from 'groupfi-sdk-chat'
import useEncryptionPublicKey from 'hooks/useEncryptionPublicKey'
import useSignature from 'hooks/useSignature'
import { LogoAndTitle } from './shared'

export default function Login() {
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
    <div className={classNames('w-full h-full flex flex-col justify-between overflow-auto')}>
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
