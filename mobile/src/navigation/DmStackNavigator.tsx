import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DmInboxScreen } from "../screens/DmInboxScreen";
import { DmConversationScreen } from "../screens/DmConversationScreen";

export type DmStackParamList = {
  DmInbox: undefined;
  DmConversation: { otherUserId: string };
};

const Stack = createNativeStackNavigator<DmStackParamList>();

export function DmStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DmInbox" component={DmInboxScreen} />
      <Stack.Screen name="DmConversation" component={DmConversationScreen} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}
