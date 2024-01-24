import { classNames } from 'utils'
import { GroupFiServiceWrapper, Modal } from '../Shared'
import TanglePayLogo from 'public/icons/tanglepay-logo.svg'
import ErrorCircle from 'public/icons/error-circle.svg'
import ErrorCancel from 'public/icons/error-cancel.svg'

import { useState } from 'react'

function UserNameCreation() {
  const [modalShow, setModalShow] = useState<boolean>(false)

  return (
    <div className={classNames('w-full h-full pt-[148px] relative')}>
      <div className={classNames('flex flex-row justify-center')}>
        <img src={TanglePayLogo} className={classNames('w-7 h-7 mr-3')} />
        <span
          className={classNames('text-2xl leading-7 font-bold text-[#3671EE]')}
        >
          GroupFi
        </span>
      </div>
      <div className={classNames('flex flex-row mt-20 justify-center')}>
        <span className={classNames('font-bold text-base text-[#333]')}>
          Free Mint a Name NFT
        </span>
      </div>
      <div className="mt-3 flex flex-row justify-center">
        <div className="flex w-[263px] rounded-md shadow-sm bg-[#f2f2f7] text-[#333] rounded-[10px] text-base">
          <input
            type="text"
            autoFocus
            className="block flex-1 border-0 bg-transparent py-1.5 pl-1 outline-0 placeholder:pl-5 placeholder:text-base placeholder:font-normal h-10"
            placeholder="9 - 20 letters & numbers"
          />
          <span className="flex select-none items-center pr-3">.gf</span>
        </div>
      </div>
      <ErrorInfo />
      <div
        className={classNames(
          'absolute left-0 bottom-7 w-full flex flex-row justify-center px-5'
        )}
      >
        <button
          className={classNames('w-full bg-[#3671EE] rounded-xl py-3')}
          onClick={() => setModalShow((s) => !s)}
        >
          <span className={classNames('text-white text-base')}>Free Mint</span>
        </button>
      </div>
      {modalShow && (
        <Modal show={true} hide={() => setModalShow(false)}>
          <div
            className={classNames(
              'w-[335px] text-[#333] bg-white rounded-xl text-base'
            )}
          >
            <div
              className={classNames(
                'py-3.5 pl-4  font-semibold border-b border-[#eee]'
              )}
            >
              Minting
            </div>
            <div className={classNames('px-5 py-3.5')}>
              The minted name NFT will be sent to your shimmer account with a
              Storage Deposit Return Lock, please remember to accept the NFT in
              your wallet.
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ErrorInfo() {
  return (
    <div
      className={classNames(
        'mt-3 flex flex-row justify-center rounded-xl px-5'
      )}
    >
      <div
        className={classNames(
          'flex w-full flex-row py-2.5 text-base bg-[#D53554]/5 rounded-xl text-[#D53554]'
        )}
      >
        <img src={ErrorCircle} className={classNames('mx-3')} />
        <div className={'flex-1'}>
          <span className={classNames('font-bold mr-1')}>Error:</span>
          <span>This name has been used</span>
        </div>
        <img src={ErrorCancel} className={classNames('mr-3 cursor-pointer')} />
      </div>
    </div>
  )
}

export default UserNameCreation
