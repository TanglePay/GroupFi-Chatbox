import { useAppSelector } from '../redux/hooks'
const useUIConfig = () => {
  const uiConfig = useAppSelector((state) => state.appConifg.uiConfig)
  return uiConfig
}

export default useUIConfig
