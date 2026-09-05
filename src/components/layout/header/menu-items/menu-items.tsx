import type { CSSProperties } from 'react';
import { observer } from 'mobx-react-lite';
import { MenuItem, Text } from '@deriv-com/ui';
import { CUSTOM_NAVIGATION_ITEMS } from '../header-config';
import './menu-items.scss';

const noOp = () => undefined;

export const MenuItems = observer(() => {
    return (
        <nav className='app-header__menu-list' aria-label='Primary navigation'>
            {CUSTOM_NAVIGATION_ITEMS.map(item => {
                const style = { '--menu-index': item.number - 1 } as CSSProperties;
                const content = (
                    <span className='app-header__menu-content'>
                        <span className='app-header__menu-number' aria-hidden='true'>
                            {String(item.number).padStart(2, '0')}
                        </span>
                        <Text size='sm'>{item.label}</Text>
                        <span className='app-header__menu-cursor' aria-hidden='true'>
                            ↖
                        </span>
                    </span>
                );

                return item.href ? (
                    <MenuItem
                        as='a'
                        className='app-header__menu'
                        href={item.href}
                        key={item.label}
                        style={style}
                    >
                        {content}
                    </MenuItem>
                ) : (
                    <MenuItem
                        as='button'
                        className='app-header__menu'
                        key={item.label}
                        onClick={noOp}
                        style={style}
                    >
                        {content}
                    </MenuItem>
                );
            })}
        </nav>
    );
});

export const TradershubLink = observer(() => {
    return null;
});

// Create a namespace for MenuItems to include TradershubLink
type MenuItemsType = typeof MenuItems & {
    TradershubLink: typeof TradershubLink;
};

// Assign TradershubLink to MenuItems
(MenuItems as MenuItemsType).TradershubLink = TradershubLink;

export default MenuItems as MenuItemsType;
