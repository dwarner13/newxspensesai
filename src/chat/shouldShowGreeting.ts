export function shouldShowGreeting(messagesCount: number) {
  // ChatGPT rule: if any history exists, do NOT greet again.
  return messagesCount === 0;
}
