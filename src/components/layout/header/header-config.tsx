import { ReactNode } from 'react';
import { standalone_routes } from '@/components/shared';
import { LegacyHomeNewIcon as TradershubLogo } from '@deriv/quill-icons/Legacy';
import {
    DerivProductBrandLightDerivBotLogoWordmarkIcon as DerivBotLogo,
    DerivProductBrandLightDerivTraderLogoWordmarkIcon as DerivTraderLogo,
    PartnersProductBrandLightSmarttraderLogoWordmarkIcon as SmarttraderLogo,
} from '@deriv/quill-icons/Logo';
import { localize } from '@deriv-com/translations';
import { isPreviewMode, PREVIEW_BASE_PATH } from '@/utils/is-preview-mode';

export type PlatformsConfig = {
    active: boolean;
    buttonIcon: ReactNode;
    description: string;
    href: string;
    icon: ReactNode;
    showInEU: boolean;
};

export type MenuItemsConfig = {
    as: 'a' | 'button';
    href: string;
    icon: ReactNode;
    label: string;
};

export type CustomNavigationItem = {
    href?: string;
    label: string;
    number: number;
};

export type TAccount = {
    balance: string;
    currency: string;
    icon: React.ReactNode;
    isActive: boolean;
    isVirtual: boolean;
    loginid: string;
    token: string;
    type: string;
};

export const platformsConfig: PlatformsConfig[] = [
    {
        active: false,
        buttonIcon: <DerivTraderLogo height={25} width={114.97} />,
        description: localize('A whole new trading experience on a powerful yet easy to use platform.'),
        href: standalone_routes.trade,
        icon: <DerivTraderLogo height={32} width={148} />,
        showInEU: true,
    },
    {
        active: true,
        buttonIcon: <DerivBotLogo height={25} width={94} />,
        description: localize('Automated trading at your fingertips. No coding needed.'),
        href: standalone_routes.bot,
        icon: <DerivBotLogo height={32} width={121} />,
        showInEU: false,
    },
    {
        active: false,
        buttonIcon: <SmarttraderLogo height={24} width={115} />,
        description: localize('Trade the world’s markets with our popular user-friendly platform.'),
        href: standalone_routes.smarttrader,
        icon: <SmarttraderLogo height={32} width={153} />,
        showInEU: false,
    },
];

export const TRADERS_HUB_LINK_CONFIG = {
    as: 'a',
    href: standalone_routes.traders_hub,
    icon: <TradershubLogo iconSize='xs' />,
    label: 'Home',
};

export const CUSTOM_NAVIGATION_ITEMS: CustomNavigationItem[] = [
    { href: '#dashboard', label: localize('Home'), number: 1 },
    { href: '#chart', label: localize('Charts'), number: 2 },
    { href: '#dashboard', label: localize('Dashboard'), number: 3 },
    {
        href: isPreviewMode() ? `${PREVIEW_BASE_PATH}/bulk-trader` : '/bulk-trader',
        label: localize('Bulk Trader'),
        number: 4,
    },
    {
        href: isPreviewMode() ? `${PREVIEW_BASE_PATH}/manual-trader` : '/manual-trader',
        label: localize('Manual Trader'),
        number: 5,
    },
    {
        href: isPreviewMode() ? `${PREVIEW_BASE_PATH}/copy-trading` : '/copy-trading',
        label: localize('Copy Trading'),
        number: 6,
    },
    {
        href: isPreviewMode() ? `${PREVIEW_BASE_PATH}/free-bots` : '/free-bots',
        label: localize('Free Bots'),
        number: 7,
    },
    {
        href: isPreviewMode() ? `${PREVIEW_BASE_PATH}/analysis-tool` : '/analysis-tool',
        label: localize('Analysis Tool'),
        number: 8,
    },
    {
        href: isPreviewMode() ? `${PREVIEW_BASE_PATH}/quick-bot` : '/quick-bot',
        label: localize('Quick Bot'),
        number: 9,
    },
    { href: '#bot_builder', label: localize('Bot Builder'), number: 10 },
];

export const MenuItems: MenuItemsConfig[] = [];
