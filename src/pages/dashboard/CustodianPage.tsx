import { Navigate } from "react-router-dom";
import { CUSTODIAN_SETTINGS_PATH, buildCustodianLaunchState } from "../../lib/custodianLaunch";

/**
 * H1-A: /dashboard/custodian is reached only when the customer explicitly selects
 * Custodian. It hands off to Settings, which opens the existing Custodian chat once
 * (see src/lib/custodianLaunch.ts). Previously this called a launcher function that
 * never existed and crashed the route.
 */
export default function CustodianPage() {
  return <Navigate to={CUSTODIAN_SETTINGS_PATH} replace state={buildCustodianLaunchState()} />;
}
