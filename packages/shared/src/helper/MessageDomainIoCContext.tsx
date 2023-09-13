import React, { createContext, useContext, PropsWithChildren } from 'react'
import { MessageAggregateRootDomain } from '../domain/MesssageAggregateRootDomain';
import { Container } from 'typescript-ioc';
// helper utils for intergrating message domain with react context
const MessageDomainIoCContext = createContext({
  messageDomain: Container.get(MessageAggregateRootDomain)
});

export const useMessageDomain = () => {
  return useContext(MessageDomainIoCContext);
}

export const IoCProvider: React.FC = ({ children }: PropsWithChildren<{}>) => {
  return <MessageDomainIoCContext.Provider value={{
    messageDomain: Container.get(MessageAggregateRootDomain)
  }}>
    {children}
  </MessageDomainIoCContext.Provider>;
}

/*
in app 
<MessageDomainIoCContext>
  <YourApp />
</MessageDomainIoCContext>
then
in component, 
const { messageDomain } = useMessageDomain();
*/