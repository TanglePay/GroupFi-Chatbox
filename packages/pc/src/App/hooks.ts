import { useState, useEffect } from 'react'
import { useMessageDomain } from 'groupfi-sdk-shared'

import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { setUserProfile } from '../redux/appConfigSlice'

export function useCheckDelegationModeNameNft(address: string) {
  const { messageDomain } = useMessageDomain()
  const [isHasNameNft, setIsHasNameNft] = useState<boolean | undefined>(
    undefined
  )

  const listerner = async () => {
    const res = messageDomain.getIsHasDelegationModeNameNft()
    const userProfileMap = await messageDomain.getOneBatchUserProfile([address])
    appDispatch(setUserProfile(userProfileMap[address]))
    setIsHasNameNft(res)
  }

  const appDispatch = useAppDispatch()

  useEffect(() => {
    setIsHasNameNft(undefined)
    appDispatch(setUserProfile(undefined))

    const off1 = messageDomain.onIsHasDelegationModeNameNftChanged(listerner)

    return () => {
      off1()
    }
  }, [address])

  return isHasNameNft
}

export function useCheckIsHasPairX(address: string) {
  const { messageDomain } = useMessageDomain()
  const [isHasPairX, setIsHasPairX] = useState<boolean>(false)

  useEffect(() => {
    setIsHasPairX(false)
    const off1 = messageDomain.onIsHasPairXChanged(() => {
      const res = messageDomain.getIsHasPairX()
      setIsHasPairX(res)
    })
    return () => {
      off1()
    }
  }, [address])

  return isHasPairX
}

export function useCheckNicknameNft(
  address: string
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
      const hasUnclaimedNameNFT = await groupFiService.hasUnclaimedNameNFT()
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

export function useCheckPublicKey(address: string) {
  const { messageDomain } = useMessageDomain()

  const [hasPublicKey, setHasPublicKey] = useState<boolean | undefined>(
    undefined
  )

  useEffect(() => {
    if (address !== undefined) {
      setHasPublicKey(undefined)

      const off1 = messageDomain.onAquiringPublicKeyOnce(() => {
        setHasPublicKey(false)
      })
      const off2 = messageDomain.onIsHasPublicKeyChangedOnce(() => {
        setHasPublicKey(true)
      })

      return () => {
        off1()
        off2()
      }
    }
  }, [address])

  return hasPublicKey
}

export function useCheckBalance(address: string) {
  const { messageDomain } = useMessageDomain()

  const [hasEnoughCashToken, setHasEnoughCashToken] = useState<
    boolean | undefined
  >(undefined)

  useEffect(() => {
    setHasEnoughCashToken(undefined)
    const off1 = messageDomain.onHasEnoughCashTokenOnce(() => {
      setHasEnoughCashToken(true)
    })
    const off2 = messageDomain.onNotHasEnoughCashTokenOnce(() => {
      setHasEnoughCashToken(false)
    })
    return () => {
      off1()
      off2()
    }
  }, [address])

  return hasEnoughCashToken
}
