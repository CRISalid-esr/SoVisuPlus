'use client'

import {
  AnchorHTMLAttributes,
  createContext,
  forwardRef,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link, { LinkProps } from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import NavigationGuardModal from './NavigationGuardModal'

interface NavigationGuardContextValue {
  /** Register/unregister a reason to block navigation, keyed by a stable id. */
  setBlocked: (id: string, blocked: boolean) => void
  /**
   * Run `navigate` immediately when nothing is blocking, otherwise defer it
   * behind the confirmation modal (run on confirm, dropped on cancel).
   */
  guard: (navigate: () => void) => void
}

const NavigationGuardContext =
  createContext<NavigationGuardContextValue | null>(null)

/**
 * App-level guard for unsaved changes. Mounted once (in MainLayout) above every
 * authenticated route. Editable surfaces declare intent to block via
 * `useBlockNavigation`; navigation is funnelled through the guard by the
 * `useGuardedRouter` / `GuardedLink` primitives (in-app links and programmatic
 * pushes) plus a `popstate` handler (browser back/forward) and a `beforeunload`
 * prompt (reload, tab close, external links).
 *
 * This deliberately does NOT patch `history.pushState`: that fights Next's own
 * router internals. Intercepting at the navigation source keeps it stable across
 * Next versions and free of render-phase state updates.
 */
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const blockersRef = useRef<Set<string>>(new Set())
  const currentUrlRef = useRef('')
  const bypassPopRef = useRef(false)
  const [pending, setPending] = useState<(() => void) | null>(null)

  const isBlocked = useCallback(() => blockersRef.current.size > 0, [])

  const setBlocked = useCallback((id: string, blocked: boolean) => {
    if (blocked) blockersRef.current.add(id)
    else blockersRef.current.delete(id)
  }, [])

  const guard = useCallback(
    (navigate: () => void) => {
      if (isBlocked()) setPending(() => navigate)
      else navigate()
    },
    [isBlocked],
  )

  // Keep the live URL so a back/forward bounce can restore the right entry.
  useEffect(() => {
    currentUrlRef.current = window.location.href
  }, [pathname, searchParams])

  // Hard unloads: reload, tab close, external links.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isBlocked()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isBlocked])

  // Browser back/forward: the URL already moved, so bounce back to the guarded
  // page (via Next's own pushState, so it re-renders consistently) and prompt.
  useEffect(() => {
    const handler = () => {
      if (bypassPopRef.current) {
        bypassPopRef.current = false
        return
      }
      if (!isBlocked()) return
      window.history.pushState(null, '', currentUrlRef.current)
      setPending(() => () => {
        bypassPopRef.current = true
        window.history.back()
      })
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [isBlocked])

  const value = useMemo(() => ({ setBlocked, guard }), [setBlocked, guard])

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <NavigationGuardModal
        open={pending !== null}
        onStay={() => setPending(null)}
        onLeave={() => {
          const navigate = pending
          setPending(null)
          navigate?.()
        }}
      />
    </NavigationGuardContext.Provider>
  )
}

/**
 * Declare that navigation should be guarded while `blocked` is true (e.g. there
 * are unsaved edits). Safe to call when no provider is mounted (no-op).
 */
export function useBlockNavigation(blocked: boolean): void {
  const ctx = useContext(NavigationGuardContext)
  const id = useId()
  useEffect(() => {
    if (!ctx) return
    ctx.setBlocked(id, blocked)
    return () => ctx.setBlocked(id, false)
  }, [ctx, id, blocked])
}

/**
 * Router push/replace that pass through the navigation guard. Use these (or
 * `GuardedLink`) for any programmatic navigation that could leave an editable
 * page. Falls back to the raw router when no provider is mounted.
 */
export function useGuardedRouter() {
  const ctx = useContext(NavigationGuardContext)
  const router = useRouter()
  return useMemo(
    () => ({
      push: (href: string) =>
        ctx ? ctx.guard(() => router.push(href)) : router.push(href),
      replace: (href: string) =>
        ctx ? ctx.guard(() => router.replace(href)) : router.replace(href),
    }),
    [ctx, router],
  )
}

type GuardedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: ReactNode
  }

const isModifiedEvent = (event: React.MouseEvent): boolean =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0

/**
 * Drop-in replacement for `next/link` that routes clicks through the navigation
 * guard. External hrefs, new-tab targets and modified clicks are left untouched.
 */
export const GuardedLink = forwardRef<HTMLAnchorElement, GuardedLinkProps>(
  function GuardedLink({ href, onClick, target, ...rest }, ref) {
    const ctx = useContext(NavigationGuardContext)
    const router = useRouter()
    const url = href.toString()
    const isExternal = /^https?:\/\//.test(url) || url.startsWith('mailto:')

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (
        !ctx ||
        isExternal ||
        (target && target !== '_self') ||
        isModifiedEvent(event) ||
        event.defaultPrevented
      ) {
        return
      }
      event.preventDefault()
      ctx.guard(() => router.push(url))
    }

    return (
      <Link
        href={href}
        target={target}
        onClick={handleClick}
        ref={ref}
        {...rest}
      />
    )
  },
)
