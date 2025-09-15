import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import MobileDebugPanel from "../dev/MobileDebugPanel";
import { useMobileRevolution } from "../../hooks/useMobileRevolution";

type Props = {
  Mobile: React.ComponentType<any>;
  Desktop: React.ComponentType<any>;
  mobileProps?: any;
  desktopProps?: any;
};

export default function MobileLayoutGate({ Mobile, Desktop, mobileProps, desktopProps }: Props) {
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
    final: shouldRenderMobile
  });

  return (
    <>
      <MobileDebugPanel data={{ ...data.debugData, shouldRenderMobile }} />
      {shouldRenderMobile ? (
        <Mobile 
          {...mobileProps}
          isMobile={true}
          currentView={data.currentView || 'dashboard'}
          onViewChange={(view: string) => console.log('View change:', view)}
          onUpload={() => console.log('Upload triggered')}
          isProcessing={false}
          transactionCount={0}
          discoveries={[]}
          activeEmployee=""
          notifications={0}
          onEmployeeSelect={(employeeId: string) => console.log('Employee selected:', employeeId)}
          onStoryAction={(action: string, storyId: string) => console.log('Story action:', action, storyId)}
        />
      ) : (
        <div className="desktop-only">
          <Desktop {...desktopProps} />
        </div>
      )}
    </>
  );
}
