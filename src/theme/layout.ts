import { Platform } from 'react-native';

/** Floating tab dock metrics — keep screens’ bottom padding in sync */
export const TAB_BAR = {
  height: 64,
  marginHorizontal: 18,
  /** Extra space above home indicator / nav gesture area */
  baseBottom: Platform.OS === 'android' ? 10 : 6,
} as const;

/** Content clearance above the floating tab bar (add safe-area bottom inset) */
export function tabBarContentInset(bottomInset: number): number {
  return TAB_BAR.height + TAB_BAR.baseBottom + Math.max(bottomInset, 8) + 16;
}

/** Absolute bottom offset for FABs sitting above the dock */
export function fabBottomOffset(bottomInset: number): number {
  return TAB_BAR.height + TAB_BAR.baseBottom + Math.max(bottomInset, 8) + 12;
}
