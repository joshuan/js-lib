'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { mediaStore, serverSnapshot } from './media.js';
export { AppBrand, NavigationFrame, type NavigationFrameProps } from './navigation.js';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/** Routing, translation and authorisation belong to the host application. */
export function PageHeader({
  title,
  description,
  back,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={`jui-page-header${className ? ` ${className}` : ''}`}>
      {back != null && <div className="jui-page-back">{back}</div>}
      <div className="jui-page-heading">
        <div className="jui-page-copy">
          <h1 className="jui-page-title">{title}</h1>
          {description != null && <div className="jui-page-description">{description}</div>}
          {meta != null && <div className="jui-page-meta">{meta}</div>}
        </div>
        {actions != null && <div className="jui-page-actions">{actions}</div>}
      </div>
    </header>
  );
}

const colorScheme = mediaStore('(prefers-color-scheme: dark)');
const motion = mediaStore('(prefers-reduced-motion: reduce)');

/** SSR starts in light mode; hydration and later OS changes use the live preference. */
export function useSystemAppearance() {
  const dark = useSyncExternalStore(colorScheme.subscribe, colorScheme.snapshot, serverSnapshot);
  const reducedMotion = useSyncExternalStore(motion.subscribe, motion.snapshot, serverSnapshot);
  return { dark, reducedMotion };
}
