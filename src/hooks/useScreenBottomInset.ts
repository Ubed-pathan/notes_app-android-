import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/** Extra space above the tab bar for FAB / scroll padding */
export function useScreenBottomInset(extra = 16) {
  const tabBarHeight = useBottomTabBarHeight();
  return {
    tabBarHeight,
    fabBottom: tabBarHeight + extra,
    listPaddingBottom: tabBarHeight + extra + 56,
    scrollPaddingBottom: tabBarHeight + extra,
  };
}
