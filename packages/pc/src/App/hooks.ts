import { useState, useEffect } from 'react'
import {
  useMessageDomain,
  Mode,
  ShimmerMode,
  ImpersonationMode,
  DelegationMode
} from 'groupfi_trollbox_shared'

import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { setUserProfile } from '../redux/appConfigSlice'

export function useCheckNicknameNftAndCashTokenAndPublicKey(
  address: string | undefined
) {
  const [mintProcessFinished, onMintFinish] = useCheckNicknameNft(address)
  const [hasEnoughCashToken, hasPublicKey] =
    useCheckCashTokenAndPublicKey(address)

  return {
    mintProcessFinished,
    onMintFinish,
    hasEnoughCashToken,
    hasPublicKey
  }
}

export function useCheckNicknameNft(
  address: string | undefined
): [boolean | undefined, () => void] {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

  const appDispatch = useAppDispatch()

  const [mintProcessFinished, setMintProcessFinished] = useState<
    undefined | boolean
  >(undefined)

  const checkIfhasOneNicknameNft = async (address: string) => {
    if (groupFiService) {
      const res = await groupFiService.fetchAddressNames([address])
      if (res[address] !== undefined) {
        appDispatch(setUserProfile(res[address]))
        setMintProcessFinished(true)
        return
      }
      const hasUnclaimedNameNFT = true
      // const hasUnclaimedNameNFT = await groupFiService.hasUnclaimedNameNFT()
      setMintProcessFinished(hasUnclaimedNameNFT)
    }
  }

  useEffect(() => {
    if (address !== undefined) {
      appDispatch(setUserProfile(undefined))
      setMintProcessFinished(undefined)
      checkIfhasOneNicknameNft(address)
    }
  }, [address])

  const onMintFinish = () => setMintProcessFinished(true)

  return [mintProcessFinished, onMintFinish]
}

export function useCheckCashTokenAndPublicKey(
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
