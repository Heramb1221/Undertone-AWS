import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FeedScreen } from "../screens/FeedScreen";
import { PostDetailScreen } from "../screens/PostDetailScreen";
import type { PostDetailParams } from "./sharedParams";

export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: PostDetailParams;
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: true, title: "" }} />
    </Stack.Navigator>
  );
}
