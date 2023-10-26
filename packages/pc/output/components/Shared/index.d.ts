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
export declare function Loading({ marginTop, type }: {
    marginTop?: string;
    type?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function LoadingModal(): import("react/jsx-runtime").JSX.Element;
export declare function Modal(props: {
    show: boolean;
    hide: () => void;
    component: (props: {
        hide: () => void;
    }) => JSX.Element;
    opacity?: number;
    bgColor?: string;
}): false | import("react").ReactPortal;
export declare function AsyncActionWrapper({ children, onCallback, onClick }: PropsWithChildren<{
    onCallback?: () => void;
    onClick: () => Promise<void>;
}>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map