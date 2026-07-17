import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { FeedStackNavigator } from "./FeedStackNavigator";
import { ExploreStackNavigator } from "./ExploreStackNavigator";
import { DmStackNavigator } from "./DmStackNavigator";
import { ProfileScreen } from "../screens/ProfileScreen";

export type MainTabParamList = {
  FeedTab: undefined;
  ExploreTab: undefined;
  DmTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Simple text-glyph tab icons for now — swappable for real icon assets (e.g.
// lucide-react-native) without touching navigation structure. Kept minimal
// since this sandbox can't visually verify icon rendering anyway.
function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{ title: "Home", tabBarIcon: ({ color }) => <TabIcon glyph="●" color={color} /> }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreStackNavigator}
        options={{ title: "Explore", tabBarIcon: ({ color }) => <TabIcon glyph="○" color={color} /> }}
      />
      <Tab.Screen
        name="DmTab"
        component={DmStackNavigator}
        options={{ title: "Messages", tabBarIcon: ({ color }) => <TabIcon glyph="✉" color={color} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profile", tabBarIcon: ({ color }) => <TabIcon glyph="◐" color={color} /> }}
      />
    </Tab.Navigator>
  );
}
