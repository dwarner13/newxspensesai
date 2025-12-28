import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import MobileDebugPanel from "../dev/MobileDebugPanel";
import { useMobileRevolution } from "../../hooks/useMobileRevolution";

type Props = {
  Mobile: React.ComponentType<any>;
  Desktop: React.ComponentType<any>;
  mobileProps?: any;
  desktopProps?: any;
  children?: React.ReactNode;
};

export default function MobileLayoutGate({ Mobile, Desktop, mobileProps, desktopProps, children }: Props) {
  const { pathname } = useLocation();
  const data = useMobileRevolution(); // MUST return { path,width,isMobile,isMobileByWidth,isLikelyMobileUA,isExcludedRoute,shouldRenderMobile,currentView }

  // ✅ Render Mobile on all dashboard routes (root and sub-routes)
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // URL/manual override: ?forceLayout=mobile|desktop
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const force = params?.get("forceLayout");
  const forcedMobile = force === "mobile";
  const forcedDesktop = force === "desktop";

  const shouldRenderMobile = isDashboardRoute && (forcedMobile ? true : forcedDesktop ? false : data.shouldRenderMobile);

  // expose to CSS / devtools
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.layout = shouldRenderMobile ? "mobile" : "desktop";
    el.dataset.path = data.debugData?.path || "";
  }, [shouldRenderMobile, data.debugData?.path]);

  // HARD LOGS
  /* eslint-disable no-console */
  console.info("[MobileLayoutGate] decision", {
    path: data.debugData?.path,
    width: data.debugData?.width,
    isMobile: data.isMobile,
    isMobileByWidth: data.debugData?.isMobileByWidth,
    isLikelyMobileUA: data.debugData?.isLikelyMobileUA,
    isExcludedRoute: data.debugData?.isExcludedRoute,
    shouldRenderMobile: data.shouldRenderMobile,
    forced: force || null,
    final: shouldRenderMobile});

  // Determine what to render based on route
  const isDashboardRoot = pathname === '/dashboard';
  
  return (
    <>
      <MobileDebugPanel data={{ ...data.debugData, shouldRenderMobile }} />
      {shouldRenderMobile ? (
        // Use DashboardLayout for mobile (it has its own mobile detection)
        <Desktop {...desktopProps} />
      ) : (
        <div className="desktop-only">
          <Desktop {...desktopProps} />
        </div>
      )}
      {/* Render children if provided (for non-nested routes) OR Outlet (for nested routes) */}
      {children ? children : <Outlet />}
    </>
  );
}
