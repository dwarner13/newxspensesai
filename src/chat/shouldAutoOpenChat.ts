export function shouldAutoOpenChat(userInitiatedThisSession: boolean) {
  // Never auto-open on mount/login/route. Only explicit user action.
  return userInitiatedThisSession === true;
}
