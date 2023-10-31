import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { classNames } from 'utils'
import RobotSVG from 'public/avatars/robot.svg'
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
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { useEffect, useState } from 'react'
import { Loading, AsyncActionWrapper } from 'components/Shared'
import { useGroupFiService } from 'hooks'

const maxShowMemberNumber = 15

function GroupInfo() {
  const { id: groupId } = useParams()

  if (groupId === undefined) {
    return null
  }

  const [loading, setLoading] = useState(true)

  const { messageDomain } = useMessageDomain()

  const groupFiService = useGroupFiService()

  const [memberAddresses, setMemberAddresses] = useState<string[]>([])

  const getMemberAddresses = async () => {
    const res = await groupFiService.loadGroupMemberAddresses(groupId)
    console.log('****Member Address', res)
    setMemberAddresses(res)
    setLoading(false)
  }

  useEffect(() => {
    getMemberAddresses()
  }, [])

  const isGroupMember = true

  if (loading) {
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
          {memberAddresses.map((memberAddress, index) => (
            <Member
              avatar={RobotSVG}
              muted={false}
              address={memberAddress}
              key={memberAddress}
              isLastOne={(index + 1) % 5 === 0}
              name={memberAddress.slice(memberAddress.length - 5)}
            />
          ))}
        </div>
        {memberAddresses.length > maxShowMemberNumber && <ViewMoreMembers />}
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <GroupStatus isGroupMember={isGroupMember} groupId={groupId} />
        </div>
        <div className={classNames('mx-5 border-t border-black/10 py-4')}>
          <ReputationInGroup />
        </div>
        <LeaveOrUnMark groupId={groupId} />
      </ContentWrapper>
    </ContainerWrapper>
  )
}

function Member(props: {
  avatar: string
  muted: boolean
  isLastOne: boolean
  name: string
  address: string
}) {
  const { avatar, address, isLastOne, muted, name } = props
  const navigate = useNavigate()
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
            src={avatar}
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
          {name}
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
            onClick: () => {
              navigate(`/user/${address}`)
            },
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
            onClick={onClick}
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
  const { messageDomain } = useMessageDomain()
  const groupFiService = useGroupFiService()

  const [isPublic, setIsPublic] = useState<boolean | undefined>(undefined)

  const getIsGroupPublic = async () => {
    const res = await groupFiService.isGroupPublic(groupId)
    setIsPublic(res)
  }

  useEffect(() => {
    getIsGroupPublic()
  }, [])

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
      {props.isGroupMember && (
        <Vote groupId={groupId} refresh={getIsGroupPublic} />
      )}
    </div>
  )
}

function Vote(props: { groupId: string; refresh?: () => Promise<void> }) {
  const { groupId, refresh } = props

  const groupFiService = useGroupFiService()

  const [votesCount, setVotesCount] = useState<{
    publicCount: number
    privateCount: number
  }>()

  const [voteRes, setVoteRes] = useState<number>()

  const [menuShow, setMenuShow] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const getVoteResAndvotesCount = async () => {
    const groupVotesCount = await groupFiService.loadGroupVotesCount(groupId)
    console.log('***groupVotesCount', groupVotesCount)
    const voteRes = await groupFiService.getGroupVoteRes(groupId)
    console.log('***voteRes', voteRes)
    setVotesCount(groupVotesCount)
    setVoteRes(voteRes)
  }

  useEffect(() => {
    getVoteResAndvotesCount()
  }, [])

  const onVote = async (vote: number) => {
    try {
      if (voteRes === vote) {
        console.log('$$$unvote start')
        // unvote
        await groupFiService.voteOrUnVoteGroup(groupId, undefined)
        console.log('$$$unvote end')
      } else {
        console.log('$$$vote start:', vote)
        // vote
        await groupFiService.voteOrUnVoteGroup(groupId, vote)
        console.log('$$$vote end:', vote)
      }
      await Promise.all([
        getVoteResAndvotesCount(),
        refresh ? refresh() : undefined
      ])
    } catch (error) {
      console.log('***onVote Error', error)
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

function LeaveOrUnMark(props: { groupId: string }) {
  const { groupId } = props
  const [modalShow, setModalShow] = useState(false)

  const groupFiService = useGroupFiService()

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
      <Modal show={modalShow} hide={hide}>
        <LeaveOrUnMarkDialog hide={hide} groupId={groupId} />
      </Modal>
    </>
  )
}

function LeaveOrUnMarkDialog(props: { hide: () => void; groupId: string }) {
  const { hide, groupId } = props
  const groupFiService = useGroupFiService()
  return (
    <div className={classNames('w-[334px] bg-white rounded-2xl p-4')}>
      <div className={classNames('text-center font-medium')}>
        Leaving Group Chat “{groupFiService.groupIdToGroupName(groupId)}”
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
