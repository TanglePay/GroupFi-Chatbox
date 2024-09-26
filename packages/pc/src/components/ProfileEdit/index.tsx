import useProfile from 'hooks/useProfile'
import { UserNameCreation } from '../UserName'

import { useNavigate } from 'react-router-dom'

function ProfileEdit() {
  const profile = useProfile()
  const navigate = useNavigate()

  return (
    <UserNameCreation
      onMintFinish={() => {}}
      currentProfile={profile}
      hasReturnIcon={true}
      navigateFunc={navigate}
    />
  )
}

export default ProfileEdit
