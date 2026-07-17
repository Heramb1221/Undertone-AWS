import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/LoginScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { OnboardingInterestsScreen } from "../screens/OnboardingInterestsScreen";
import { OnboardingIdentityScreen } from "../screens/OnboardingIdentityScreen";
import { MainTabNavigator } from "./MainTabNavigator";
import { navigationRef } from "./navigationRef";
import type { InterestId } from "../lib/interests";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  OnboardingInterests: undefined;
  OnboardingIdentity: { interests: InterestId[]; initialName: string };
  Main: undefined;
};

// Re-exported so screen files only need one import path for every param list.
export type { ExploreStackParamList } from "./ExploreStackNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="OnboardingInterests" component={OnboardingInterestsScreen} />
        <Stack.Screen name="OnboardingIdentity" component={OnboardingIdentityScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
