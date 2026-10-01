'use client';

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button, Drawer, Layout, theme } from 'antd';
import { dimensions } from './index.js';
import { mediaStore, serverSnapshot } from './media.js';

const phone = mediaStore('(max-width: 767px)');
const tablet = mediaStore('(max-width: 1023px)');

export function AppBrand({ name, mark }: { name: string; mark: ReactNode }) {
  return (
    <span className="jui-brand">
      <span className="jui-brand-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="jui-brand-name">{name}</span>
    </span>
  );
}

function NavigationIcon({ kind }: { kind: 'open' | 'close' | 'collapse' | 'expand' }) {
  const path = {
    open: 'M3 5h18M3 12h18M3 19h18',
    close: 'm6 6 12 12M6 18 18 6',
    collapse: 'm14 6-6 6 6 6',
    expand: 'm10 6 6 6-6 6',
  }[kind];
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export interface NavigationFrameProps {
  /** A host-owned home link containing AppBrand. */
  brand: ReactNode;
  pathname: string;
  navigation: (collapsed: boolean) => ReactNode;
  children: ReactNode;
  mobileActions?: ReactNode;
  labels: { navigation: string; open: string; close: string; collapse: string; expand: string };
}

/** Shared navigation mechanics; menus, user controls and routes remain in the applications. */
export function NavigationFrame({
  brand,
  pathname,
  navigation,
  children,
  mobileActions,
  labels,
}: NavigationFrameProps) {
  const mobile = useSyncExternalStore(phone.subscribe, phone.snapshot, serverSnapshot);
  const narrow = useSyncExternalStore(tablet.subscribe, tablet.snapshot, serverSnapshot);
  const [preference, setPreference] = useState<boolean | null>(null);
  const collapsed = preference ?? narrow;
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = mobile && openedAt === pathname;
  if (openedAt !== null && (openedAt !== pathname || !mobile)) setOpenedAt(null);
  const id = useId();
  const { token } = theme.useToken();
  const close = () => setOpenedAt(null);

  const content = (compact: boolean) => (
    <nav
      id={id}
      aria-label={labels.navigation}
      className="jui-navigation"
      data-collapsed={compact}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest('a[href]')) close();
      }}
    >
      <div className="jui-navigation-brand">
        {brand}
        {mobile && (
          <Button
            type="text"
            aria-label={labels.close}
            onClick={close}
            icon={<NavigationIcon kind="close" />}
          />
        )}
      </div>
      <div className="jui-navigation-body">{navigation(compact)}</div>
      {!mobile && (
        <Button
          type="text"
          className="jui-navigation-toggle"
          aria-label={compact ? labels.expand : labels.collapse}
          aria-expanded={!compact}
          aria-controls={id}
          onClick={() => setPreference(!compact)}
          icon={<NavigationIcon kind={compact ? 'expand' : 'collapse'} />}
        />
      )}
    </nav>
  );

  return (
    <Layout className="jui-shell">
      {mobile ? (
        <Drawer
          className="jui-navigation-drawer"
          placement="left"
          size={dimensions.navigationDrawer}
          open={open}
          onClose={close}
          closable={false}
          title={null}
          destroyOnHidden
          aria-label={labels.navigation}
          styles={{ body: { padding: 0 } }}
        >
          {content(false)}
        </Drawer>
      ) : (
        <Layout.Sider
          className="jui-sidebar"
          width={dimensions.sidebar}
          collapsedWidth={dimensions.sidebarCollapsed}
          collapsed={collapsed}
          trigger={null}
          style={{
            position: 'sticky',
            top: 0,
            height: '100dvh',
            background: token.colorBgContainer,
            borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {content(collapsed)}
        </Layout.Sider>
      )}
      <Layout className="jui-shell-main">
        {mobile && (
          <div className="jui-mobile-bar">
            <Button
              type="text"
              aria-label={labels.open}
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpenedAt(pathname)}
              icon={<NavigationIcon kind="open" />}
            />
            {brand}
            {mobileActions}
          </div>
        )}
        {children}
      </Layout>
    </Layout>
  );
}
