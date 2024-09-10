import { useState, useEffect } from 'react'
import { useMessageDomain } from 'groupfi_chatbox_shared'

const useContextField = <T>(fieldName: string): T | undefined => {
  const { messageDomain } = useMessageDomain()

  const [value, setValue] = useState<T>(messageDomain.getFieldValue<T>(fieldName))

  useEffect(() => {
    
    const handleConfigChange = () => {
      const updatedValue = messageDomain.getFieldValue<T>(fieldName)
      setValue(updatedValue)
    }

    messageDomain.onFieldChanged(fieldName, handleConfigChange)

    return () => {
      messageDomain.onFieldChanged(fieldName, handleConfigChange)
    }
  }, [])

  return value
}

export default useContextField
