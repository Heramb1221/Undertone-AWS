import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ExploreCirclesScreen } from "../screens/ExploreCirclesScreen";
import { CreateCircleScreen } from "../screens/CreateCircleScreen";
import { CircleDetailScreen } from "../screens/CircleDetailScreen";
import { PostDetailScreen } from "../screens/PostDetailScreen";
import { NewPostScreen } from "../screens/NewPostScreen";
import { ModerationQueueScreen } from "../screens/ModerationQueueScreen";
import type { PostDetailParams, NewPostParams } from "./sharedParams";

export type ExploreStackParamList = {
  ExploreCircles: undefined;
  CreateCircle: undefined;
  CircleDetail: { circleId: string };
  PostDetail: PostDetailParams;
  NewPost: NewPostParams;
  ModerationQueue: { circleId: string };
};

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export function ExploreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreCircles" component={ExploreCirclesScreen} />
      <Stack.Screen name="CreateCircle" component={CreateCircleScreen} options={{ headerShown: true, title: "New Circle" }} />
      <Stack.Screen name="CircleDetail" component={CircleDetailScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: true, title: "" }} />
      <Stack.Screen name="NewPost" component={NewPostScreen} options={{ headerShown: true, title: "New post" }} />
      <Stack.Screen name="ModerationQueue" component={ModerationQueueScreen} options={{ headerShown: true, title: "Moderator queue" }} />
    </Stack.Navigator>
  );
}
