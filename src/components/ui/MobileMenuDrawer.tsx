import React from "react";
type Props = { open: boolean; onClose: () => void; children?: React.ReactNode; };
export default function MobileMenuDrawer({ open, onClose, children }: Props) {
  // Deprecated — MobileSidebar renders directly now
  return null;
}
