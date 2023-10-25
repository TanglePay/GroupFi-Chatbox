import { PropsWithChildren } from 'react';
export declare function AppWrapper({ children }: PropsWithChildren<{}>): import("react/jsx-runtime").JSX.Element;
export declare function ContainerWrapper({ children }: PropsWithChildren<{}>): import("react/jsx-runtime").JSX.Element;
export declare function HeaderWrapper({ children }: PropsWithChildren<{}>): import("react/jsx-runtime").JSX.Element;
export declare function ContentWrapper({ children }: PropsWithChildren<{}>): import("react/jsx-runtime").JSX.Element;
export declare function ReturnIcon(): import("react/jsx-runtime").JSX.Element;
export declare function GroupTitle({ showGroupIcon, title }: {
    showGroupIcon?: boolean;
    title: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function MoreIcon({ to }: {
    to: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function Loading({ marginTop }: {
    marginTop?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function Modal(props: {
    show: boolean;
    hide: () => void;
    component: (props: {
        hide: () => void;
    }) => JSX.Element;
}): false | import("react").ReactPortal;
//# sourceMappingURL=index.d.ts.map