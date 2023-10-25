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
import MuteWhiteSVG from 'public/icons/mute-white.svg'
import {
  ContainerWrapper,
  HeaderWrapper,
  ContentWrapper,
  ReturnIcon,
  GroupTitle,
  Modal
} from '../Shared'
import { useGroupFiService } from 'groupfi_trollbox_shared'
import { useEffect, useState } from 'react'
import ErrorPage from 'components/Error/index'
import { Loading, AsyncActionWrapper } from 'components/Shared'

function GroupInfo() {
  const { id: groupName } = useParams()

  const [groupId, setGroupId] = useState<string>()

  const [loading, setLoading] = useState(true)

  const [memberAddresses, setMemberAddresses] = useState<string[]>([])

  const groupFiService = useGroupFiService()

  useEffect(() => {
    if (groupFiService === undefined || groupName === undefined) {
      return
    }
    const id = groupFiService.groupNameToGroupId(groupName)
    if (id !== undefined) {
      setGroupId(id)
    }
  }, [groupFiService])

  useEffect(() => {
    if (groupId !== undefined) {
      ;(async () => {
        const res = await groupFiService!.loadGroupMemberAddresses(groupId)
        setMemberAddresses(res)
        setLoading(false)
      })()
    }
  }, [groupId])

  const isGroupMember = true

  if (loading || groupId === undefined) {
    return <Loading />
  }

  return (
    <ContainerWrapper>
      <HeaderWrapper>
        <ReturnIcon />
        <GroupTitle
          showGroupIcon={false}
          title={`Group (${memberAddresses.length})`}
        />
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
            <Member
              src={src}
              muted={true}
              key={index}
              isLastOne={(index + 1) % 5 === 0}
            />
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
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <GroupStatus isGroupMember={isGroupMember} groupId={groupId} />
        </div>
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <ReputationInGroup />
        </div>
        <LeaveOrUnMark />
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function Member(props: { src: string; muted: boolean; isLastOne: boolean }) {
  const { src, isLastOne, muted } = props
  const [menuShow, setMenuShow] = useState(false)
  return (
    <div
      className={classNames('relative')}
      onMouseLeave={() => {
        if (menuShow) {
          setMenuShow(false)
        }
      }}
    >
      <div className={classNames('w-14 cursor-pointer')}>
        <div className={classNames('relative')}>
          <img
            onClick={() => {
              setMenuShow((s) => !s)
            }}
            className={classNames('rounded-lg w-full h-14')}
            src={src}
          />
          {muted && (
            <img
              className={classNames('absolute right-0 bottom-0')}
              src={MuteWhiteSVG}
            />
          )}
        </div>
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
            text: 'Mute',
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
            <span className={classNames('pl-7 font-medium')}>{text}</span>
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

function GroupStatus(props: { isGroupMember: boolean; groupId: string }) {
  const { groupId } = props
  const groupFiService = useGroupFiService()

  const [isPublic, setIsPublic] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (groupFiService === undefined) {
      return
    }
    ;(async () => {
      const res = await groupFiService.isGroupPublic(groupId)
      setIsPublic(res)
    })()
  }, [groupFiService])

  return (
    <div className={classNames('flex flex-row')}>
      <div className={classNames('flex-1')}>Group Status</div>
      <div className={classNames('flex-none')}>
        {isPublic === undefined
          ? 'loading...'
          : isPublic
          ? 'Public'
          : 'Private'}
      </div>
      {props.isGroupMember && <Vote groupId={groupId} />}
    </div>
  )
}

function Vote(props: { groupId: string }) {
  const { groupId } = props

  const groupFiService = useGroupFiService()

  const [votesCount, setVotesCount] = useState<{
    publicCount: number
    privateCount: number
  }>()

  const [voteRes, setVoteRes] = useState<number>()

  const [menuShow, setMenuShow] = useState(false)

  const [asyncActionStart, setAsyncActionStart] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (groupFiService === undefined) {
      return
    }
    ;(async () => {
      try {
        const groupVotesCount = await groupFiService.loadGroupVotesCount(
          groupId
        )
        console.log('***groupVotesCount', groupVotesCount)
        setVotesCount(groupVotesCount)
        const voteRes = await groupFiService.getGroupVoteRes(groupId)
        console.log('***voteRes', voteRes)
        setVoteRes(voteRes)
      } catch (error) {
        console.log('***Error:', error)
      }
    })()
  }, [groupFiService])

  const voteOrUnVoteGroup = async (vote: number | undefined) => {
    if (groupFiService === undefined) {
      return
    }
    if (vote === undefined) {
      await groupFiService.unvoteGroup(groupId)
    } else {
      await groupFiService.voteGroup(groupId, vote)
    }
  }

  const onVote = async (vote: number) => {
    if (voteRes === vote) {
      console.log('***unvote start')
      // unvote
      await voteOrUnVoteGroup(undefined)
      console.log('***unvote end')
    } else {
      console.log('***vote start:', vote)
      // vote
      await voteOrUnVoteGroup(vote)
      console.log('***vote end:', vote)
    }
  }

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
          onMouseOver={onMouseEnter}
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
            value: 0,
            number: votesCount?.publicCount ?? ''
          },
          {
            text: 'Private',
            value: 1,
            number: votesCount?.privateCount ?? ''
          }
        ].map(({ text, number, value }) => (
          <AsyncActionWrapper
            onClick={() => {
              return onVote(value)
            }}
          >
            <div
              className={classNames(
                'text-sm py-3.5 px-3 flex cursor-pointer',
                voteRes === value ? 'text-[#3671EE]' : 'text-[#333]'
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
          </AsyncActionWrapper>
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
