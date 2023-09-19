import { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { classNames } from 'utils'
import IotaKeySVG from 'public/avatars/iotakey.svg'
import RobotSVG from 'public/avatars/robot.svg'
import IotaapeSVG from 'public/avatars/iotaape.svg'
import QuestionSVG from 'public/icons/question.svg'
import ArrowRightSVG from 'public/icons/arrrow-right.svg'
import ViewMemberSVG from 'public/icons/view-member.svg'
import MuteBigSVG from 'public/icons/mute-big.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  ReturnIcon,
  GroupTitle,
  Modal
} from '../Shared'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { useEffect, useState } from 'react'

function GroupInfo() {
  const { id: groupName } = useParams()

  const isGroupMember = true

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle showGroupIcon={false} title={'Group (3)'} />
      </HeaderWrapper>
      <ContentWrapper>
        <div
          className={classNames(
            'grid grid-cols-[repeat(5,auto)] gap-x-3.5 gap-y-2 px-15px pt-5 pb-3'
          )}
        >
          {[
            IotaKeySVG,
            RobotSVG,
            IotaapeSVG,
            IotaKeySVG,
            RobotSVG,
            IotaapeSVG,
            IotaapeSVG,
            IotaKeySVG,
            IotaapeSVG,
            IotaapeSVG,
            IotaKeySVG,
            IotaKeySVG,
            RobotSVG,
            IotaapeSVG
          ].map((src, index) => (
            <Member src={src} key={src} isLastOne={(index + 1) % 5 === 0} />
          ))}
          {/* <div
            className={classNames(
              'w-14 h-14 flex flex-row justify-center items-center border border-black/10 border-dashed rounded-lg text-black/20 cursor-pointer'
            )}
          >
            <AddOutline fontSize={32} />
          </div> */}
        </div>
        <ViewMoreMembers />
        {[GroupStatus, ReputationInGroup].map((Component) => (
          <div className={classNames('mx-5 border-t border-black/10 py-4')}>
            <Component isGroupMember={isGroupMember} />
          </div>
        ))}
        <LeaveOrUnMark />
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function Member(props: { src: string; isLastOne: boolean }) {
  const { src, isLastOne } = props
  const [menuShow, setMenuShow] = useState(false)
  return (
    <div className="relative">
      <div className={classNames('w-14 cursor-pointer')}>
        <img
          onClick={() => {
            setMenuShow((s) => !s)
          }}
          className={classNames('rounded-lg w-full h-14')}
          src={src}
        />
        <p
          className={classNames('text-xs opacity-50 text-center mt-1 truncate')}
        >
          abby.eth
        </p>
      </div>
      <div
        className={classNames(
          'absolute left-0 min-w-[88px] top-[50px] z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuShow ? 'block' : 'hidden',
          isLastOne ? 'left-[-14px]' : 'left-0'
        )}
      >
        {[
          {
            text: 'View',
            onClick: () => {},
            icon: ViewMemberSVG
          },
          {
            text: 'MUTE',
            onClick: () => {},
            icon: MuteBigSVG
          }
        ].map(({ text, onClick, icon }) => (
          <div
            className={classNames(
              'text-sm py-3.5 px-3 cursor-pointer relative'
            )}
          >
            <img src={icon} className={classNames('h-[18px] absolute top-4')} />
            <span className={classNames('pl-7')}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ViewMoreMembers() {
  return (
    <div className={classNames('text-center mb-5')}>
      <span
        className={classNames(
          'inline-flex flex-row justify-center items-center text-sm text-black/50 cursor-pointer'
        )}
      >
        View More Members
        <img src={ArrowRightSVG} className={classNames('ml-1 mt-px')} />
      </span>
    </div>
  )
}

function GroupStatus(props: { isGroupMember: boolean }) {
  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>Group Status</div>
      <div className={classNames('flex-none')}>Private</div>
      {props.isGroupMember && <Vote />}
    </div>
  )
}

function Vote() {
  const [menuShow, setMenuShow] = useState(false)
  const voteStatus: string | undefined = 'public'

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const onMouseEnter = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!menuShow) {
      setMenuShow(true)
    }
  }
  const onMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setMenuShow(false)
    }, 250)
  }
  return (
    <div className="relative">
      <div>
        <div
          className={classNames('flex-none ml-4 text-primary cursor-pointer')}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          VOTE
        </div>
      </div>

      <div
        className={classNames(
          'absolute right-0 w-24 z-10 mt-2 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuShow ? 'block' : 'hidden'
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {[
          {
            text: 'Public',
            key: 'public',
            number: 8
          },
          {
            text: 'Private',
            key: 'private',
            number: 35
          }
        ].map(({ text, number, key }) => (
          <div
            className={classNames(
              'text-sm py-3.5 px-3 flex cursor-pointer',
              voteStatus === key ? 'text-[#3671EE]' : 'text-[#333]'
            )}
          >
            {text}
            <span
              className={classNames(
                'w-[18px] h-[18px] text-center ml-[auto] font-medium'
              )}
            >
              {number}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReputationInGroup(props: {}) {
  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>
        <span>My Reputation in Group</span>
        <img src={QuestionSVG} className={classNames('inline-block ml-2')} />
      </div>
      <div className={classNames('flex-none ml-4 font-medium')}>65</div>
    </div>
  )
}

function LeaveOrUnMark() {
  const [modalShow, setModalShow] = useState(false)

  const hide = () => {
    setModalShow(false)
  }
  return (
    <>
      <div
        className={classNames(
          'absolute left-0 bottom-0 w-full px-5 text-center'
        )}
      >
        <div
          className={classNames(
            'border-t border-black/10 pt-4 pb-5 text-[#D53554] text-sm cursor-pointer'
          )}
          onClick={() => {
            setModalShow((s) => !s)
          }}
        >
          Leave
        </div>
      </div>
      <Modal show={modalShow} component={LeaveOrUnMarkDialog} hide={hide} />
    </>
  )
}

function LeaveOrUnMarkDialog(props: { hide: () => void }) {
  const { hide } = props
  return (
    <div className={classNames('w-[334px] bg-white rounded-2xl p-4')}>
      <div className={classNames('text-center font-medium')}>
        Leaving Group Chat “IOTABOTS”
      </div>
      <div className={classNames('mt-4 flex font-medium justify-between')}>
        {[
          {
            text: 'Cancel',
            onClick: () => {
              hide()
            },
            className: 'bg-[#F2F2F7]'
          },
          {
            text: 'Leave',
            onClick: () => {
              hide()
            },
            className: 'bg-[#D53554] text-white'
          }
        ].map(({ text, onClick, className }) => (
          <button
            className={classNames(
              'w-[143px] text-center py-3 rounded-[10px]',
              className
            )}
            onClick={onClick}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default GroupInfo